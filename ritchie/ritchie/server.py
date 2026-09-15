"""Servidor HTTP de RITCHIE: API JSON + interfaz web.

Sin dependencias externas: usa la librería estándar. Un análisis completo tarda
decenas de segundos la primera vez, así que las preguntas se atienden como
trabajos en segundo plano y la interfaz consulta el avance. La segunda vez que
se pregunta lo mismo, la respuesta sale de la caché al instante.
"""

from __future__ import annotations

import json
import mimetypes
import os
import threading
import time
import traceback
import uuid
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import ENGINE_FULL_NAME, ENGINE_NAME, ENGINE_VERSION, config_for_profile
from .data.sources import DEFAULT_SOURCE_ORDER, available_sources
from .features.targets import TargetSpec
from .nlq import parse
from .pipeline import Ritchie

WEB_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")

EXAMPLES = [
    "¿Qué probabilidad hay de que MARA suba 4% mañana?",
    "¿Qué podría pasar con AAPL durante los próximos 5 días?",
    "¿Cuál es el escenario más probable para NVDA en dos semanas?",
    "¿Qué probabilidad hay de que BTC-USD baje 10% en 10 días?",
    "¿Qué factores están influyendo en TSLA?",
    "¿SPY se queda dentro de ±3% este mes?",
]

#: Los mismos ejemplos (y más), organizados por tipo de activo para la barra
#: lateral. Cada categoría explica en una frase qué cubre y qué no, para no
#: prometer de más: RITCHIE analiza la serie de precios (o de rendimiento)
#: del instrumento con el mismo método estadístico sin importar la categoría
#: — no calcula primas de opciones ni modela derivados OTC.
EXAMPLE_CATEGORIES = [
    {
        "id": "acciones",
        "etiqueta": "Acciones",
        "descripcion": "Empresas que cotizan en bolsa.",
        "ejemplos": [
            "¿Qué probabilidad hay de que MARA suba 4% mañana?",
            "¿Qué podría pasar con AAPL durante los próximos 5 días?",
            "¿Cuál es el escenario más probable para NVDA en dos semanas?",
            "¿Qué factores están influyendo en TSLA?",
        ],
    },
    {
        "id": "criptomonedas",
        "etiqueta": "Criptomonedas",
        "descripcion": "Bitcoin, Ethereum y similares, contra dólar.",
        "ejemplos": [
            "¿Qué probabilidad hay de que BTC-USD baje 10% en 10 días?",
            "¿Cuál es el escenario más probable para ETH-USD en un mes?",
            "¿Qué tan probable es que Solana suba 8% esta semana?",
        ],
    },
    {
        "id": "indices",
        "etiqueta": "Índices",
        "descripcion": "Canastas amplias del mercado, como termómetro general.",
        "ejemplos": [
            "¿SPY se queda dentro de ±3% este mes?",
            "¿Qué probabilidad hay de que el Nasdaq baje 5% en dos semanas?",
            "¿Cuál es el escenario más probable para el IPC en un mes?",
        ],
    },
    {
        "id": "materias_primas",
        "etiqueta": "Materias primas",
        "descripcion": "Oro, petróleo, granos y otros bienes físicos.",
        "ejemplos": [
            "¿Qué probabilidad hay de que el oro suba 3% en 10 días?",
            "¿Qué podría pasar con el petróleo en dos semanas?",
            "¿Qué tan probable es que el cobre baje 5% este mes?",
        ],
    },
    {
        "id": "divisas",
        "etiqueta": "Divisas",
        "descripcion": "Tipos de cambio entre monedas.",
        "ejemplos": [
            "¿Qué probabilidad hay de que el dólar suba 2% frente al peso en un mes?",
            "¿Qué podría pasar con el euro en 10 días?",
        ],
    },
    {
        "id": "bonos",
        "etiqueta": "Bonos gubernamentales",
        "descripcion": "Rendimientos del Tesoro de EE. UU. y ETFs de renta fija, "
        "tratados con el mismo método estadístico que una acción — no es un "
        "modelo especializado de tasas.",
        "ejemplos": [
            "¿Qué probabilidad hay de que el bono a 10 años suba 4% en dos semanas?",
            "¿Qué podría pasar con los bonos del tesoro largo plazo este mes?",
            "¿Qué tan probable es que las letras del tesoro bajen esta semana?",
        ],
    },
    {
        "id": "futuros",
        "etiqueta": "Futuros",
        "descripcion": "Contratos sobre índices y materias primas a futuro. "
        "RITCHIE no calcula opciones ni otros derivados sobre estos contratos.",
        "ejemplos": [
            "¿Qué probabilidad hay de que el futuro del S&P500 suba 2% mañana?",
            "¿Qué podría pasar con el futuro del petróleo en 5 días?",
        ],
    },
]


class JobRegistry:
    """Trabajos en curso, con su avance. Vive en memoria del proceso."""

    def __init__(self, keep: int = 40):
        self._jobs: dict[str, dict] = {}
        self._order: list[str] = []
        self._lock = threading.Lock()
        self.keep = keep

    def create(self, question: str) -> str:
        job_id = uuid.uuid4().hex[:12]
        with self._lock:
            self._jobs[job_id] = {
                "estado": "trabajando",
                "etapa": "Preparando",
                "avance": 0.0,
                "pregunta": question,
                "creado": datetime.now(timezone.utc).isoformat(),
            }
            self._order.append(job_id)
            while len(self._order) > self.keep:
                self._jobs.pop(self._order.pop(0), None)
        return job_id

    def update(self, job_id: str, stage: str, value: float) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job and job["estado"] == "trabajando":
                job["etapa"] = stage
                job["avance"] = round(float(value), 3)

    def finish(self, job_id: str, payload: dict) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is not None:
                job.update({"estado": "listo", "avance": 1.0, "etapa": "Listo", "resultado": payload})

    def fail(self, job_id: str, message: str, detail: str = "") -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is not None:
                job.update({"estado": "error", "mensaje": message, "detalle": detail, "avance": 1.0})

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None


class RitchieServer:
    def __init__(
        self,
        profile: str = "rapido",
        allow_synthetic: bool = False,
        source_order: tuple[str, ...] = DEFAULT_SOURCE_ORDER,
        use_cache: bool = True,
    ):
        self.profile = profile
        self.allow_synthetic = allow_synthetic
        self.engine = Ritchie(
            config=config_for_profile(profile),
            allow_synthetic=allow_synthetic,
            use_result_cache=use_cache,
            source_order=source_order,
        )
        self.jobs = JobRegistry()

    # ------------------------------------------------------------- trabajos
    def submit(self, question: str, symbol: str | None = None) -> str:
        job_id = self.jobs.create(question)

        def worker() -> None:
            try:
                result = self.engine.ask(
                    question,
                    default_symbol=symbol,
                    progress=lambda stage, value: self.jobs.update(job_id, stage, value),
                )
                self.jobs.finish(job_id, result.to_dict())
            except Exception as exc:  # noqa: BLE001 - se reporta al usuario tal cual
                self.jobs.fail(job_id, f"{type(exc).__name__}: {exc}", traceback.format_exc()[-1500:])

        threading.Thread(target=worker, daemon=True).start()
        return job_id

    def submit_spec(self, symbol: str, spec: TargetSpec) -> str:
        question = f"{symbol}: {spec.describe()}"
        job_id = self.jobs.create(question)

        def worker() -> None:
            try:
                result = self.engine.analyze(
                    symbol,
                    spec,
                    progress=lambda stage, value: self.jobs.update(job_id, stage, value),
                )
                self.jobs.finish(job_id, result.to_dict())
            except Exception as exc:  # noqa: BLE001
                self.jobs.fail(job_id, f"{type(exc).__name__}: {exc}", traceback.format_exc()[-1500:])

        threading.Thread(target=worker, daemon=True).start()
        return job_id

    def status(self) -> dict:
        return {
            "motor": ENGINE_NAME,
            "nombre_completo": ENGINE_FULL_NAME,
            "version": ENGINE_VERSION,
            "perfil": self.profile,
            "fuentes_configuradas": list(self.engine.loader.source_order),
            "fuentes_disponibles": available_sources(),
            "datos_simulados_permitidos": self.allow_synthetic,
            "ejemplos": EXAMPLES,
            "categorias": EXAMPLE_CATEGORIES,
        }


def build_handler(server: RitchieServer):
    class Handler(BaseHTTPRequestHandler):
        server_version = f"{ENGINE_NAME}/{ENGINE_VERSION}"

        def log_message(self, fmt: str, *args) -> None:  # pragma: no cover - ruido
            return

        # ------------------------------------------------------ utilidades
        def _json(self, payload: dict, status: int = 200) -> None:
            body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _static(self, relative: str) -> None:
            safe = os.path.normpath(relative).lstrip("/\\")
            path = os.path.join(WEB_ROOT, safe)
            if not path.startswith(WEB_ROOT) or not os.path.isfile(path):
                self._json({"error": "no encontrado"}, 404)
                return
            content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
            with open(path, "rb") as handle:
                body = handle.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{content_type}; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        # ------------------------------------------------------------- GET
        def do_GET(self) -> None:  # noqa: N802 - firma de la librería estándar
            parsed = urlparse(self.path)
            route = parsed.path
            query = parse_qs(parsed.query)

            if route in ("/", "/index.html"):
                self._static("index.html")
                return
            if route == "/api/estado":
                self._json(server.status())
                return
            if route == "/api/interpretar":
                question = (query.get("pregunta") or [""])[0]
                self._json(parse(question).to_dict())
                return
            if route.startswith("/api/trabajo/"):
                job_id = route.rsplit("/", 1)[-1]
                job = server.jobs.get(job_id)
                if job is None:
                    self._json({"error": "trabajo no encontrado"}, 404)
                else:
                    self._json(job)
                return
            if route == "/api/analizar":
                symbol = (query.get("simbolo") or [""])[0]
                if not symbol:
                    self._json({"error": "falta el parámetro simbolo"}, 400)
                    return
                try:
                    spec = TargetSpec(
                        horizon=int((query.get("horizonte") or ["1"])[0]),
                        threshold=float((query.get("umbral") or ["0.04"])[0]),
                        direction=(query.get("direccion") or ["up"])[0],
                        mode=(query.get("modo") or ["close"])[0],
                    )
                except (ValueError, TypeError) as exc:
                    self._json({"error": f"parámetros inválidos: {exc}"}, 400)
                    return
                self._json({"trabajo": server.submit_spec(symbol, spec)})
                return

            self._static(route)

        # ------------------------------------------------------------ POST
        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path != "/api/preguntar":
                self._json({"error": "ruta no encontrada"}, 404)
                return
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._json({"error": "cuerpo JSON inválido"}, 400)
                return
            question = (body.get("pregunta") or "").strip()
            if not question:
                self._json({"error": "falta la pregunta"}, 400)
                return
            job_id = server.submit(question, body.get("simbolo"))
            self._json({"trabajo": job_id, "interpretacion": parse(question).to_dict()})

    return Handler


def serve(
    host: str = "127.0.0.1",
    port: int = 8777,
    profile: str = "rapido",
    allow_synthetic: bool = False,
    source_order: tuple[str, ...] = DEFAULT_SOURCE_ORDER,
    open_browser: bool = True,
) -> None:
    ritchie_server = RitchieServer(
        profile=profile, allow_synthetic=allow_synthetic, source_order=source_order
    )
    # Puerto 0 = "el sistema operativo elige uno libre". Útil cuando el
    # puerto por defecto ya está ocupado por una corrida anterior.
    httpd = ThreadingHTTPServer((host, port), build_handler(ritchie_server))
    actual_port = httpd.server_address[1]
    url = f"http://{host}:{actual_port}"

    banner = f"{ENGINE_NAME} {ENGINE_VERSION} — perfil «{profile}»"
    print(banner)
    print(f"Abre {url} en tu navegador.")
    if allow_synthetic:
        print("AVISO: datos simulados habilitados. Nada de lo que veas es un mercado real.")
    print("Ctrl+C para detener.")

    if open_browser:
        # Se abre solo, un instante después de que el puerto ya esté
        # escuchando, para no competir con el arranque del servidor.
        def _open() -> None:
            time.sleep(0.6)
            try:
                webbrowser.open(url)
            except Exception:  # noqa: BLE001 - abrir el navegador es una cortesía, no un requisito
                pass

        threading.Thread(target=_open, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nHasta luego.")
    finally:
        httpd.server_close()
