"""Pruebas de los modelos: que ajusten, que no mientan y que sean reproducibles."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.models import build_candidates
from ritchie.models.base import SeriesContext, event_probability_from_paths, simulate_iid_bootstrap
from ritchie.models.bayes import BayesianAnalogModel
from ritchie.models.ensemble import EnsembleSpec, default_ensembles, disagreement, from_logit, to_logit
from ritchie.models.garch import GarchModel
from ritchie.models.timeseries import ArBootstrapModel, MarkovRegimeModel
from ritchie.features.targets import TargetSpec


@pytest.fixture(scope="module")
def entrenados(dataset, contexto):
    x, y = dataset["x"], dataset["y"]
    corte = int(len(x) * 0.7)
    modelos = {}
    for modelo in build_candidates("rapido"):
        modelo.fit(x.iloc[:corte], y.iloc[:corte], contexto)
        modelos[modelo.name] = modelo
    return {"modelos": modelos, "x_test": x.iloc[corte:], "y_test": y.iloc[corte:]}


def test_todos_los_modelos_del_spec_estan_presentes():
    nombres = {m.name for m in build_candidates()}
    for esperado in (
        "tasa_base", "logistica", "bayesiano_analogos", "ar_bootstrap", "garch",
        "markov_regimenes", "random_forest", "gradient_boosting",
    ):
        assert esperado in nombres


def test_toda_probabilidad_esta_en_rango(entrenados, contexto):
    for nombre, modelo in entrenados["modelos"].items():
        probabilidades = modelo.predict_proba(entrenados["x_test"], contexto)
        assert len(probabilidades) == len(entrenados["x_test"]), nombre
        assert np.isfinite(probabilidades).all(), nombre
        assert probabilidades.min() >= 0.0 and probabilidades.max() <= 1.0, nombre


def test_los_modelos_son_reproducibles(dataset, contexto):
    x, y = dataset["x"].iloc[:800], dataset["y"].iloc[:800]
    prueba = dataset["x"].iloc[800:900]
    for constructor in (GarchModel, ArBootstrapModel, MarkovRegimeModel, BayesianAnalogModel):
        a = constructor().fit(x, y, contexto).predict_proba(prueba, contexto)
        b = constructor().fit(x, y, contexto).predict_proba(prueba, contexto)
        assert np.allclose(a, b), constructor.__name__


def test_garch_recupera_los_parametros_que_generaron_la_serie(contexto, dataset):
    """Se ajusta GARCH a una serie generada con parámetros conocidos."""
    rng = np.random.default_rng(3)
    n = 3000
    omega, alpha, beta = 2.0e-6, 0.10, 0.85
    varianza = omega / (1 - alpha - beta)
    retornos = np.empty(n)
    for i in range(n):
        retornos[i] = np.sqrt(varianza) * rng.standard_normal()
        varianza = omega + alpha * retornos[i] ** 2 + beta * varianza

    from ritchie.data.quality import assess, normalize_frame
    from ritchie.data.schema import MarketData, utcnow

    close = 50 * np.exp(np.cumsum(retornos))
    index = pd.bdate_range(end="2026-01-01", periods=n)
    frame = pd.DataFrame(
        {"open": close, "high": close * 1.01, "low": close * 0.99, "close": close,
         "raw_close": close, "volume": np.full(n, 1e6)},
        index=index,
    )
    frame.attrs["adjusted"] = True
    clean, stats = normalize_frame(frame)
    clean.attrs["adjusted"] = True
    market = MarketData(
        symbol="GARCH", frame=clean, source="synthetic_test_fixture", retrieved_at=utcnow(),
        is_synthetic=True, quality=assess(clean, stats),
    )
    ctx = SeriesContext(market=market, spec=TargetSpec(1, 0.04, "up", "close"), seed=1, n_paths=200)
    modelo = GarchModel()
    x = pd.DataFrame({"dummy": np.zeros(n)}, index=index)
    y = pd.Series(np.zeros(n), index=index)
    modelo.fit(x, y, ctx)
    assert modelo.params
    assert modelo.params["alpha"] == pytest.approx(alpha, abs=0.06)
    assert modelo.params["beta"] == pytest.approx(beta, abs=0.08)
    assert modelo.params["alpha"] + modelo.params["beta"] < 1.0


def test_garch_sigma_solo_usa_el_pasado(dataset, contexto):
    modelo = GarchModel().fit(dataset["x"].iloc[:900], dataset["y"].iloc[:900], contexto)
    fechas = dataset["x"].index[900:940]
    completo = modelo.conditional_sigma(contexto, fechas)
    recortado_ctx = SeriesContext(
        market=contexto.market.slice_until(fechas[-1]), spec=contexto.spec,
        seed=contexto.seed, n_paths=contexto.n_paths,
    )
    recortado = modelo.conditional_sigma(recortado_ctx, fechas)
    assert np.allclose(completo, recortado, equal_nan=True)


def test_markov_separa_dos_regimenes_de_volatilidad(dataset, contexto):
    modelo = MarkovRegimeModel().fit(dataset["x"], dataset["y"], contexto)
    assert modelo.ready
    assert modelo.sigma[1] > modelo.sigma[0]  # 0 = calma, 1 = estrés
    assert 0 < modelo.transition[0, 0] <= 1 and 0 < modelo.transition[1, 1] <= 1
    assert np.allclose(modelo.transition.sum(axis=1), 1.0)


def test_markov_usa_filtro_no_suavizado(dataset, contexto):
    """Las probabilidades de estado no pueden cambiar al añadir datos futuros."""
    modelo = MarkovRegimeModel().fit(dataset["x"].iloc[:900], dataset["y"].iloc[:900], contexto)
    fechas = dataset["x"].index[900:920]
    completo = modelo.filtered_states(contexto, fechas)
    corte = SeriesContext(
        market=contexto.market.slice_until(fechas[-1]), spec=contexto.spec,
        seed=contexto.seed, n_paths=contexto.n_paths,
    )
    assert np.allclose(completo, modelo.filtered_states(corte, fechas), equal_nan=True)


def test_tasa_base_reproduce_la_frecuencia_historica(dataset, contexto):
    from ritchie.models.baselines import BaseRateModel

    x, y = dataset["x"], dataset["y"]
    modelo = BaseRateModel().fit(x, y, contexto)
    probabilidad = modelo.predict_proba(x.iloc[:5], contexto)[0]
    assert probabilidad == pytest.approx(y.mean(), abs=0.01)
    assert len(set(modelo.predict_proba(x.iloc[:10], contexto))) == 1


def test_bayesiano_se_queda_cerca_de_la_previa_sin_evidencia(dataset, contexto):
    modelo = BayesianAnalogModel(n_neighbors=5, prior_strength=200.0)
    modelo.fit(dataset["x"], dataset["y"], contexto)
    probabilidades = modelo.predict_proba(dataset["x"].iloc[-30:], contexto)
    assert np.allclose(probabilidades, modelo.base_rate, atol=0.05)


def test_bayesiano_entrega_evidencia_contable(dataset, contexto):
    modelo = BayesianAnalogModel().fit(dataset["x"], dataset["y"], contexto)
    evidencia = modelo.analog_evidence(dataset["x"].iloc[-1], contexto)
    assert evidencia["vecinos"] > 0
    assert 0 <= evidencia["aciertos"] <= evidencia["vecinos"]
    assert len(evidencia["fechas_ejemplo"]) > 0


def test_modelos_con_una_sola_clase_no_se_rompen(dataset, contexto):
    from ritchie.models.ml import GradientBoostingModel, LogisticModel, RandomForestModel

    x = dataset["x"].iloc[:300]
    y = pd.Series(np.zeros(300, dtype=int), index=x.index)
    for constructor in (LogisticModel, RandomForestModel, GradientBoostingModel):
        modelo = constructor().fit(x, y, contexto)
        probabilidades = modelo.predict_proba(x.iloc[-10:], contexto)
        assert np.isfinite(probabilidades).all()
        assert (probabilidades < 0.05).all()


def test_explicaciones_apuntan_a_variables_reales(entrenados, contexto, dataset):
    fila = dataset["x"].iloc[-1]
    for nombre in ("logistica", "random_forest", "gradient_boosting"):
        aportes = entrenados["modelos"][nombre].explain(fila, contexto)
        assert aportes, nombre
        for aporte in aportes:
            assert aporte.feature in dataset["x"].columns
            assert aporte.direction in ("sube", "baja")
            assert np.isfinite(aporte.effect)


def test_ensembles_se_definen_de_antemano():
    nombres = ["logistica", "garch", "random_forest", "gradient_boosting", "tasa_base"]
    familias = {
        "logistica": "estadistico", "garch": "estadistico",
        "random_forest": "machine_learning", "gradient_boosting": "machine_learning",
        "tasa_base": "baseline",
    }
    specs = default_ensembles(nombres, familias)
    assert {s.name for s in specs} >= {"ensemble_todos", "ensemble_estadistico", "ensemble_ml"}
    for spec in specs:
        assert "tasa_base" not in spec.members  # las referencias no se combinan


def test_combinacion_en_logodds_es_coherente():
    predicciones = {"a": np.array([0.2, 0.8]), "b": np.array([0.2, 0.8])}
    spec = EnsembleSpec(name="x", members=("a", "b"))
    assert np.allclose(spec.combine(predicciones), [0.2, 0.8])


def test_logit_ida_y_vuelta():
    valores = np.array([0.01, 0.3, 0.5, 0.99])
    assert np.allclose(from_logit(to_logit(valores)), valores, atol=1e-6)


def test_desacuerdo_es_cero_si_todos_coinciden():
    predicciones = {"a": np.array([0.4, 0.4]), "b": np.array([0.4, 0.4])}
    assert np.allclose(disagreement(predicciones, ["a", "b"]), 0.0)


def test_probabilidad_desde_caminos_respeta_la_definicion_del_evento():
    # Dos caminos: uno sube 10% al cierre, otro baja 10%.
    caminos = np.array([[[0.10], [-0.10]]])
    assert event_probability_from_paths(caminos, TargetSpec(1, 0.04, "up", "close"))[0] == 0.5
    assert event_probability_from_paths(caminos, TargetSpec(1, 0.04, "down", "close"))[0] == 0.5
    assert event_probability_from_paths(caminos, TargetSpec(1, 0.20, "up", "close"))[0] == 0.0


def test_modo_touch_captura_el_camino_intermedio():
    # Sube 5% y regresa a 0: al cierre no llega, pero en el camino sí tocó.
    caminos = np.array([[[0.05, -0.0476]]])
    assert event_probability_from_paths(caminos, TargetSpec(2, 0.04, "up", "close"))[0] == 0.0
    assert event_probability_from_paths(caminos, TargetSpec(2, 0.04, "up", "touch"))[0] == 1.0


def test_bootstrap_por_bloques_preserva_la_distribucion():
    rng = np.random.default_rng(0)
    historia = rng.normal(0.001, 0.02, 1000)
    caminos = simulate_iid_bootstrap(historia, 1, 5, 4000, rng, block=5)
    assert caminos.shape == (1, 4000, 5)
    assert caminos.mean() == pytest.approx(historia.mean(), abs=0.002)
    assert caminos.std() == pytest.approx(historia.std(), rel=0.12)
