"""Pruebas de la interfaz y de la API que la alimenta."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.request

import pytest

from ritchie.server import EXAMPLES, RitchieServer, WEB_ROOT, build_handler

HTML = os.path.join(WEB_ROOT, "index.html")
CSS = os.path.join(WEB_ROOT, "styles.css")
JS = os.path.join(WEB_ROOT, "app.js")


@pytest.fixture(scope="module")
def html() -> str:
    with open(HTML, encoding="utf-8") as handle:
        return handle.read()


@pytest.fixture(scope="module")
def css() -> str:
    with open(CSS, encoding="utf-8") as handle:
        return handle.read()


@pytest.fixture(scope="module")
def js() -> str:
    with open(JS, encoding="utf-8") as handle:
        return handle.read()


def test_los_archivos_existen():
    for ruta in (HTML, CSS, JS):
        assert os.path.isfile(ruta), ruta
        assert os.path.getsize(ruta) > 1000


def test_el_javascript_es_sintacticamente_valido():
    node = shutil.which("node")
    if node is None:
        pytest.skip("node no está disponible en este entorno")
    resultado = subprocess.run([node, "--check", JS], capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stderr


def test_todos_los_ids_que_usa_el_javascript_existen_en_el_html(html, js):
    usados = set(re.findall(r"\$\('([a-zA-Z0-9_-]+)'\)", js))
    presentes = set(re.findall(r'id="([a-zA-Z0-9_-]+)"', html))
    # Los que el JS crea al vuelo dentro de los niveles no están en el HTML.
    dinamicos = {"curva-calibracion", "curva-capital", "barras-modelos"}
    faltantes = usados - presentes - dinamicos
    assert not faltantes, f"el JS busca elementos que no existen: {faltantes}"


def test_la_pagina_declara_los_componentes_de_la_pantalla_principal(html):
    for identificador in (
        "simbolo", "precio", "probabilidad", "confianza-chip", "titular",
        "grafica-escenarios", "grafica-precio", "factores", "niveles", "abuelita",
    ):
        assert f'id="{identificador}"' in html, identificador


def test_hay_cinco_niveles_de_divulgacion_progresiva(js):
    for nivel in ("nivel 2", "nivel 3", "nivel 4", "nivel 5"):
        assert nivel in js
    assert "level(" in js


def test_la_pagina_esta_en_espanol_y_es_accesible(html):
    assert 'lang="es"' in html
    assert "viewport" in html
    assert 'name="color-scheme"' in html
    assert html.count("aria-") >= 3


def test_el_css_define_tema_claro_y_oscuro(css):
    assert ":root" in css
    assert "prefers-color-scheme: dark" in css
    assert "prefers-reduced-motion" in css


def test_el_css_es_responsivo(css):
    assert "@media (max-width: 760px)" in css
    assert "max-width" in css


def test_no_se_cargan_recursos_externos(html):
    """La interfaz debe funcionar sin internet: nada de CDNs ni fuentes remotas."""
    externos = re.findall(r'(?:src|href)="(https?://[^"]+)"', html)
    assert not externos, externos


def test_la_interfaz_advierte_sobre_datos_simulados(html, js):
    assert "aviso-simulado" in html
    assert "simulacion" in js


def test_los_ejemplos_cubren_los_tipos_de_pregunta_del_spec():
    unidos = " ".join(EXAMPLES).lower()
    for palabra in ("probabilidad", "podría pasar", "escenario", "factores"):
        assert palabra in unidos


# ------------------------------------------------------------------- API
@pytest.fixture(scope="module")
def servidor():
    from http.server import ThreadingHTTPServer

    app = RitchieServer(
        profile="rapido", allow_synthetic=True, source_order=("synthetic_demo_pattern",)
    )
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), build_handler(app))
    hilo = threading.Thread(target=httpd.serve_forever, daemon=True)
    hilo.start()
    time.sleep(0.2)
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()
    httpd.server_close()


def _get(url: str):
    with urllib.request.urlopen(url, timeout=10) as respuesta:
        return respuesta.status, respuesta.read()


def test_la_raiz_sirve_la_interfaz(servidor):
    estado, cuerpo = _get(servidor + "/")
    assert estado == 200
    assert b"RITCHIE" in cuerpo


@pytest.mark.parametrize("archivo", ["styles.css", "app.js"])
def test_los_estaticos_se_sirven(servidor, archivo):
    estado, cuerpo = _get(f"{servidor}/{archivo}")
    assert estado == 200 and len(cuerpo) > 1000


def test_estado_describe_el_motor(servidor):
    _, cuerpo = _get(servidor + "/api/estado")
    datos = json.loads(cuerpo)
    assert datos["motor"] == "RITCHIE"
    assert datos["version"]
    assert datos["ejemplos"]
    assert datos["datos_simulados_permitidos"] is True


def test_interpretar_devuelve_la_lectura_de_la_pregunta(servidor):
    url = servidor + "/api/interpretar?pregunta=" + urllib.parse.quote(
        "¿probabilidad de que MARA suba 4% mañana?"
    )
    _, cuerpo = _get(url)
    datos = json.loads(cuerpo)
    assert datos["simbolo"] == "MARA"
    assert datos["objetivo"]["horizon"] == 1


def test_preguntar_crea_un_trabajo(servidor):
    peticion = urllib.request.Request(
        servidor + "/api/preguntar",
        data=json.dumps({"pregunta": "¿DEMO sube 4% mañana?"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(peticion, timeout=10) as respuesta:
        datos = json.loads(respuesta.read())
    assert datos["trabajo"]
    assert datos["interpretacion"]["simbolo"] == "DEMO"

    _, cuerpo = _get(f"{servidor}/api/trabajo/{datos['trabajo']}")
    trabajo = json.loads(cuerpo)
    assert trabajo["estado"] in ("trabajando", "listo")
    assert 0 <= trabajo["avance"] <= 1


def test_pregunta_vacia_se_rechaza(servidor):
    peticion = urllib.request.Request(
        servidor + "/api/preguntar",
        data=json.dumps({"pregunta": "   "}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with pytest.raises(urllib.error.HTTPError) as error:
        urllib.request.urlopen(peticion, timeout=10)
    assert error.value.code == 400


def test_trabajo_inexistente_da_404(servidor):
    with pytest.raises(urllib.error.HTTPError) as error:
        _get(servidor + "/api/trabajo/noexiste")
    assert error.value.code == 404


def test_no_se_puede_salir_de_la_carpeta_web(servidor):
    with pytest.raises(urllib.error.HTTPError) as error:
        _get(servidor + "/../ritchie/config.py")
    assert error.value.code in (400, 404)
