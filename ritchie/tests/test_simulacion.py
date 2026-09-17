"""Pruebas del motor de escenarios."""

from __future__ import annotations

import numpy as np
import pytest

from ritchie.features.targets import TargetSpec
from ritchie.models.base import SeriesContext
from ritchie.models.garch import GarchModel
from ritchie.models.timeseries import MarkovRegimeModel
from ritchie.simulation import run_scenarios


@pytest.fixture(scope="module")
def escenarios(serie_con_patron, dataset, contexto):
    spec = TargetSpec(5, 0.04, "up", "close")
    ctx = SeriesContext(market=serie_con_patron, spec=spec, seed=21, n_paths=6000)
    garch = GarchModel().fit(dataset["x"], dataset["y"], ctx)
    regimen = MarkovRegimeModel().fit(dataset["x"], dataset["y"], ctx)
    return run_scenarios(serie_con_patron, spec, ctx, n_paths=6000, garch=garch, regime=regimen)


def test_usa_los_tres_mecanismos(escenarios):
    assert set(escenarios.engines) == {"bootstrap_por_bloques", "garch_t", "cambio_de_regimen"}
    assert escenarios.n_paths > 5000


def test_percentiles_estan_ordenados(escenarios):
    valores = [escenarios.percentiles_return[f"p{p}"] for p in (1, 5, 10, 25, 50, 75, 90, 95, 99)]
    assert valores == sorted(valores)


def test_probabilidades_suman_coherentemente(escenarios):
    assert 0 <= escenarios.probability_up <= 1
    assert 0 <= escenarios.probability_down <= 1
    assert escenarios.probability_up + escenarios.probability_down == pytest.approx(1.0, abs=0.02)


def test_el_cono_arranca_estrecho_y_se_abre(escenarios):
    cono = escenarios.cone
    assert len(cono) == 5
    anchos = [p["p90"] - p["p10"] for p in cono]
    assert anchos == sorted(anchos), "la incertidumbre debe crecer con el horizonte"
    assert anchos[0] > 0


def test_escenarios_nombrados_corresponden_a_percentiles(escenarios):
    assert escenarios.cases["pesimista"]["rendimiento"] < escenarios.cases["base"]["rendimiento"]
    assert escenarios.cases["base"]["rendimiento"] < escenarios.cases["optimista"]["rendimiento"]
    precio = escenarios.last_price
    for caso in escenarios.cases.values():
        assert caso["precio"] == pytest.approx(precio * (1 + caso["rendimiento"]), rel=1e-3)


def test_metricas_de_riesgo_son_negativas_o_cero(escenarios):
    riesgo = escenarios.risk
    assert riesgo["var_95"] <= 0
    assert riesgo["cvar_95"] <= riesgo["var_95"]
    assert riesgo["caida_maxima_mediana"] <= 0
    assert 0 <= riesgo["probabilidad_perdida_10pct"] <= 1


def test_los_motores_se_reportan_por_separado(escenarios):
    for nombre, detalle in escenarios.engine_agreement.items():
        assert detalle["caminos"] > 0
        assert detalle["p10"] <= detalle["mediana"] <= detalle["p90"]


def test_umbral_mas_exigente_baja_la_probabilidad(serie_con_patron, contexto):
    ctx_bajo = SeriesContext(serie_con_patron, TargetSpec(5, 0.02, "up", "close"), seed=3, n_paths=6000)
    ctx_alto = SeriesContext(serie_con_patron, TargetSpec(5, 0.15, "up", "close"), seed=3, n_paths=6000)
    bajo = run_scenarios(serie_con_patron, ctx_bajo.spec, ctx_bajo, n_paths=6000)
    alto = run_scenarios(serie_con_patron, ctx_alto.spec, ctx_alto, n_paths=6000)
    assert bajo.probability_target > alto.probability_target


def test_horizonte_mas_largo_amplia_el_rango(serie_con_patron):
    corto = run_scenarios(
        serie_con_patron, TargetSpec(1, 0.04, "up", "close"),
        SeriesContext(serie_con_patron, TargetSpec(1, 0.04, "up", "close"), seed=5, n_paths=6000),
        n_paths=6000,
    )
    largo = run_scenarios(
        serie_con_patron, TargetSpec(20, 0.04, "up", "close"),
        SeriesContext(serie_con_patron, TargetSpec(20, 0.04, "up", "close"), seed=5, n_paths=6000),
        n_paths=6000,
    )
    ancho = lambda r: r.percentiles_return["p90"] - r.percentiles_return["p10"]  # noqa: E731
    assert ancho(largo) > ancho(corto) * 2


def test_es_reproducible(serie_con_patron):
    spec = TargetSpec(3, 0.04, "up", "close")
    ctx = lambda: SeriesContext(serie_con_patron, spec, seed=99, n_paths=4000)  # noqa: E731
    a = run_scenarios(serie_con_patron, spec, ctx(), n_paths=4000)
    b = run_scenarios(serie_con_patron, spec, ctx(), n_paths=4000)
    assert a.percentiles_return["p50"] == pytest.approx(b.percentiles_return["p50"])
