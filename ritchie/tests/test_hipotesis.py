"""Pruebas del descubrimiento de patrones."""

from __future__ import annotations

import pytest

from ritchie.research import CATALOG, discover


@pytest.fixture(scope="module")
def hallazgos(dataset):
    x, y = dataset["x"], dataset["y"]
    corte = x.index[int(len(x) * 0.75)]
    return discover(x, y, corte, today_row=x.iloc[-1])


def test_el_catalogo_esta_definido_de_antemano():
    claves = {c.key for c in CATALOG}
    assert len(claves) == len(CATALOG), "hay claves repetidas en el catálogo"
    for condicion in CATALOG:
        assert condicion.label and condicion.explanation and condicion.requires


def test_encuentra_el_patron_incrustado(hallazgos):
    """La serie de prueba rebota después de caídas fuertes: debe salir.

    No se exige una condición concreta del catálogo (cuál dispara depende de
    la volatilidad de la serie), sino que alguna de las que describen "vengo
    de una caída" resulte útil y apunte en la dirección correcta.
    """
    relacionadas = {"caida_extrema", "caida_moderada", "semana_muy_mala", "tres_bajadas"}
    candidatas = [h for h in hallazgos if h.key in relacionadas]
    assert candidatas, [h.key for h in hallazgos]
    utiles = [h for h in candidatas if h.useful]
    assert utiles, [(h.key, round(h.rate_dev, 3), round(h.p_value, 4), h.useful) for h in candidatas]
    for hipotesis in utiles:
        assert hipotesis.rate_dev > hipotesis.base_dev
        assert hipotesis.survives_correction
        assert hipotesis.confirmed_out_of_sample is True


def test_no_declara_util_lo_que_no_se_repite(serie_ruido, spec):
    from ritchie.features import align_xy, build_features, build_target

    matriz = build_features(serie_ruido, {})
    x, y, _ = align_xy(matriz.frame, build_target(serie_ruido, spec))
    corte = x.index[int(len(x) * 0.75)]
    encontrados = discover(x, y, corte, today_row=x.iloc[-1])
    assert not [h for h in encontrados if h.useful], [h.key for h in encontrados if h.useful]


def test_cada_hallazgo_reporta_su_evidencia(hallazgos):
    for hipotesis in hallazgos:
        datos = hipotesis.to_dict()
        assert datos["casos_desarrollo"] >= 40
        assert 0 <= datos["frecuencia_con_la_condicion"] <= 1
        assert datos["ic_95"][0] <= datos["frecuencia_con_la_condicion"] <= datos["ic_95"][1]
        assert datos["lectura_del_efecto"]


def test_las_condiciones_sin_suficientes_casos_se_omiten(hallazgos):
    for hipotesis in hallazgos:
        assert hipotesis.n_dev >= 40


def test_muestra_corta_no_devuelve_nada(dataset):
    x = dataset["x"].iloc[:100]
    y = dataset["y"].iloc[:100]
    assert discover(x, y, x.index[50]) == []


def test_marca_las_condiciones_activas_hoy(hallazgos):
    assert all(isinstance(h.active_today, bool) for h in hallazgos)
