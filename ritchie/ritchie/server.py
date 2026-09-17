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
from .data import quality, supabase_store
from .data.aliases import normalize_symbol
from .data.sources import (
    DEFAULT_SOURCE_ORDER,
    SourceError,
    _apply_adjustment,
    available_sources,
    parse_ohlc_frame,
    read_csv_text,
)
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
            "memoria_persistente_configurada": supabase_store.configured(),
        }

    def upload_csv(self, symbol: str | None, csv_text: str | None) -> dict:
        """Recibe un CSV subido a mano y lo guarda en la memoria persistente.

        No pasa por el motor de análisis — solo valida el formato, limpia lo
        que `quality` ya sabe limpiar (duplicados, precios imposibles) y lo
        deja en Supabase para que la próxima pregunta sobre ese símbolo lo
        encuentre ahí antes de salir a internet.
        """
        resolved = normalize_symbol((symbol or "").strip())
        if not resolved:
            return {"ok": False, "error": "Falta el símbolo del activo (por ejemplo MARA o AAPL)."}
        if not csv_text or not csv_text.strip():
            return {"ok": False, "error": "El archivo está vacío."}

        # Primero se valida el archivo, sin importar si hay dónde guardarlo
        # todavía — así la persona sabe si el problema es su CSV o el
        # servidor, nunca los dos mezclados en un solo mensaje confuso.
        try:
            raw = read_csv_text(csv_text, label="el archivo subido")
            frame = parse_ohlc_frame(raw, label="el archivo subido")
            frame = _apply_adjustment(frame)
            invalid_dates = frame.attrs.get("invalid_dates_dropped", 0)
            frame, stats = quality.normalize_frame(frame)
        except SourceError as exc:
            return {"ok": False, "error": str(exc)}
        except Exception as exc:  # noqa: BLE001 - se reporta tal cual, es entrada de la persona
            return {"ok": False, "error": f"No se pudo leer el archivo: {exc}"}
        if frame.empty:
            return {"ok": False, "error": "El archivo no trajo ninguna fila utilizable (revisa fechas y precios)."}

        if not supabase_store.configured():
            return {
                "ok": False,
                "error": (
                    f"Tu archivo se leyó bien — {len(frame)} filas del "
                    f"{frame.index[0]:%Y-%m-%d} al {frame.index[-1]:%Y-%m-%d} — pero este "
                    "servidor todavía no tiene dónde guardarlo de forma permanente."
                ),
                "como_arreglarlo": [
                    "En Render: pestaña Environment de este servicio → Add Environment Variable.",
                    "RITCHIE_SUPABASE_URL: la misma 'Project URL' que ya usa VALU en este proyecto.",
                    "RITCHIE_SUPABASE_SERVICE_KEY: la clave 'service_role' de Supabase "
                    "(Settings → API → Project API keys) — NO la 'anon'. Es secreta: no la compartas.",
                    "Después de guardarlas, Render redespliega solo. Vuelve a intentar la carga.",
                ],
            }
        saved = supabase_store.write(resolved, frame, source="manual_upload")
        if saved == 0:
            return {
                "ok": False,
                "error": "No se pudo guardar en la memoria persistente. Revisa que "
                "RITCHIE_SUPABASE_SERVICE_KEY sea correcta y no haya expirado.",
            }
        return {
            "ok": True,
            "simbolo": resolved,
            "filas_guardadas": saved,
            "desde": frame.index[0].strftime("%Y-%m-%d"),
            "hasta": frame.index[-1].strftime("%Y-%m-%d"),
            "filas_descartadas": stats.get("rows_dropped", 0),
            "fechas_no_reconocidas": invalid_dates,
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
            length = int(self.headers.get("Content-Length") or 0)
            # 12 MB: de sobra para años de velas diarias en CSV; evita que
            # una carga descuidada tumbe el proceso con un cuerpo enorme.
            if length > 12 * 1024 * 1024:
                self._json({"error": "El archivo es demasiado grande (máximo 12 MB)."}, 413)
                return

            if parsed.path == "/api/subir":
                try:
                    body = json.loads(self.rfile.read(length) or b"{}")
                except json.JSONDecodeError:
                    self._json({"error": "cuerpo JSON inválido"}, 400)
                    return
                result = server.upload_csv(body.get("simbolo"), body.get("csv"))
                self._json(result, 200 if result.get("ok") else 400)
                return

            if parsed.path != "/api/preguntar":
                self._json({"error": "ruta no encontrada"}, 404)
                return
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
