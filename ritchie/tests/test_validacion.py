"""Pruebas del protocolo temporal, las métricas y la calibración."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.config import DecisionConfig, ValidationConfig
from ritchie.models import build_candidates
from ritchie.validation import metrics as M
from ritchie.validation import run_walk_forward, select_model
from ritchie.validation.calibration import (
    IdentityCalibrator,
    IsotonicCalibrator,
    PlattCalibrator,
    choose_calibrator,
)


@pytest.fixture(scope="module")
def caminata(dataset, contexto):
    modelos = build_candidates("rapido")
    resultado = run_walk_forward(
        modelos, dataset["x"], dataset["y"], contexto,
        ValidationConfig(min_train=400, refit_every=150, final_test_fraction=0.25),
    )
    return {
        "walk": resultado,
        "familias": {m.name: m.family for m in modelos},
        "propositos": {m.name: m.purpose for m in modelos},
    }


def test_entrenamiento_siempre_precede_a_la_prueba(caminata, spec):
    for bloque in caminata["walk"].folds:
        fin_entrenamiento = pd.Timestamp(bloque.train_end)
        inicio_prueba = pd.Timestamp(bloque.test_start)
        assert fin_entrenamiento < inicio_prueba
        # Y además hay purga: al menos el horizonte de separación.
        assert (inicio_prueba - fin_entrenamiento).days >= spec.horizon


def test_las_predicciones_cubren_solo_el_futuro_de_cada_bloque(caminata):
    walk = caminata["walk"]
    assert len(walk.predictions) > 200
    assert walk.predictions.index.is_monotonic_increasing
    assert not walk.predictions.index.duplicated().any()


def test_desarrollo_y_prueba_final_no_se_solapan(caminata):
    walk = caminata["walk"]
    assert walk.dev_mask.sum() + walk.test_mask.sum() == len(walk.predictions)
    assert walk.predictions.index[walk.dev_mask].max() <= walk.dev_end
    assert walk.predictions.index[walk.test_mask].min() > walk.dev_end


def test_hay_un_modelo_ajustado_por_cada_candidato_utilizable(caminata):
    walk = caminata["walk"]
    for nombre in walk.predictions.columns:
        assert nombre in walk.fitted_models


def test_muestra_insuficiente_lanza_error_claro(dataset, contexto):
    with pytest.raises(ValueError):
        run_walk_forward(
            build_candidates("rapido"), dataset["x"].iloc[:60], dataset["y"].iloc[:60],
            contexto, ValidationConfig(min_train=400),
        )


def test_seleccion_encuentra_la_ventaja_cuando_existe(caminata):
    resultado = select_model(
        caminata["walk"].predictions, caminata["walk"].y, caminata["walk"].dev_mask,
        caminata["familias"], caminata["propositos"], DecisionConfig(), seed=13, horizon=1,
    )
    assert resultado.selected is not None, resultado.rejection_reasons[:3]
    assert resultado.reality["p_valor"] < 0.05
    ganador = next(s for s in resultado.ranking if s.name == resultado.selected)
    assert ganador.dev.brier_skill > 0
    assert not ganador.is_baseline


def test_seleccion_incluye_ensembles_en_la_competencia(caminata):
    resultado = select_model(
        caminata["walk"].predictions, caminata["walk"].y, caminata["walk"].dev_mask,
        caminata["familias"], caminata["propositos"], DecisionConfig(), seed=13, horizon=1,
    )
    nombres = {s.name for s in resultado.ranking}
    assert any(n.startswith("ensemble_") for n in nombres)


def test_sin_patron_no_se_elige_ningun_modelo(serie_ruido, spec):
    from ritchie.features import align_xy, build_features, build_target
    from ritchie.models.base import SeriesContext

    matriz = build_features(serie_ruido, {})
    objetivo = build_target(serie_ruido, spec)
    x, y, _ = align_xy(matriz.frame, objetivo)
    ctx = SeriesContext(market=serie_ruido, spec=spec, seed=5, n_paths=300)
    modelos = build_candidates("rapido")
    walk = run_walk_forward(
        modelos, x, y, ctx, ValidationConfig(min_train=400, refit_every=150, final_test_fraction=0.25)
    )
    resultado = select_model(
        walk.predictions, walk.y, walk.dev_mask,
        {m.name: m.family for m in modelos}, {m.name: m.purpose for m in modelos},
        DecisionConfig(), seed=5, horizon=1,
    )
    assert resultado.selected is None
    assert resultado.rejection_reasons


# ------------------------------------------------------------------ métricas
def test_brier_y_logloss_premian_al_modelo_perfecto():
    y = np.array([0.0, 1.0, 1.0, 0.0])
    assert M.brier_score(y, y) == 0.0
    assert M.log_loss(y, y) < 1e-5


def test_auc_de_un_ordenamiento_perfecto_es_uno():
    y = np.array([0, 0, 1, 1], dtype=float)
    assert M.roc_auc(y, np.array([0.1, 0.2, 0.8, 0.9])) == 1.0
    assert M.roc_auc(y, np.array([0.9, 0.8, 0.2, 0.1])) == 0.0


def test_auc_maneja_empates():
    y = np.array([0, 1, 0, 1], dtype=float)
    assert M.roc_auc(y, np.full(4, 0.5)) == pytest.approx(0.5)


def test_auc_sin_eventos_devuelve_none():
    assert M.roc_auc(np.zeros(10), np.random.default_rng(0).random(10)) is None


def test_habilidad_de_brier_es_cero_para_la_tasa_base():
    rng = np.random.default_rng(0)
    y = (rng.random(2000) < 0.2).astype(float)
    resultado = M.evaluate(y, np.full(2000, y.mean()))
    assert resultado.brier_skill == pytest.approx(0.0, abs=1e-9)


def test_modelo_calibrado_tiene_ece_bajo_y_pendiente_uno():
    rng = np.random.default_rng(2)
    p = rng.uniform(0.02, 0.9, 6000)
    y = (rng.random(6000) < p).astype(float)
    resultado = M.evaluate(y, p)
    assert resultado.ece < 0.03
    assert resultado.calibration_slope == pytest.approx(1.0, abs=0.12)


def test_modelo_exagerado_se_detecta():
    rng = np.random.default_rng(4)
    p = rng.uniform(0.05, 0.45, 4000)
    y = (rng.random(4000) < p).astype(float)
    exagerado = np.clip(p * 2.2, 0.001, 0.999)
    resultado = M.evaluate(y, exagerado)
    assert resultado.ece > 0.10
    assert resultado.calibration_slope < 0.8


def test_descomposicion_de_murphy_reconstruye_el_brier():
    rng = np.random.default_rng(6)
    p = np.round(rng.uniform(0.05, 0.95, 5000), 1)
    y = (rng.random(5000) < p).astype(float)
    resultado = M.evaluate(y, p, n_bins=10)
    d = resultado.decomposition
    reconstruido = d["fiabilidad"] - d["resolucion"] + d["incertidumbre"]
    assert reconstruido == pytest.approx(resultado.brier, abs=0.01)


# --------------------------------------------------------------- calibración
def test_calibracion_arregla_un_modelo_exagerado():
    rng = np.random.default_rng(8)
    verdadera = rng.uniform(0.02, 0.6, 3000)
    y = (rng.random(3000) < verdadera).astype(float)
    exagerada = np.clip(verdadera * 2.2, 0.005, 0.995)
    calibrador, reporte = choose_calibrator(exagerada, y, seed=1)
    ajustada = calibrador.transform(exagerada)
    assert reporte["decision"] != "sin_ajuste"
    assert M.expected_calibration_error(y, ajustada) < M.expected_calibration_error(y, exagerada) / 3


def test_no_se_calibra_lo_que_ya_esta_calibrado():
    rng = np.random.default_rng(9)
    p = rng.uniform(0.05, 0.8, 3000)
    y = (rng.random(3000) < p).astype(float)
    _, reporte = choose_calibrator(p, y, seed=1)
    assert reporte["decision"] == "sin_ajuste"


def test_con_poca_muestra_no_se_calibra():
    rng = np.random.default_rng(10)
    p = rng.uniform(0.1, 0.5, 40)
    y = (rng.random(40) < p).astype(float)
    calibrador, reporte = choose_calibrator(p, y)
    assert isinstance(calibrador, IdentityCalibrator)
    assert "insuficiente" in reporte["motivo"]


@pytest.mark.parametrize("constructor", [IdentityCalibrator, PlattCalibrator, IsotonicCalibrator])
def test_todo_calibrador_es_monotono_y_acotado(constructor):
    rng = np.random.default_rng(11)
    p = rng.uniform(0.01, 0.99, 800)
    y = (rng.random(800) < p).astype(float)
    calibrador = constructor()
    calibrador.fit(p, y)
    malla = np.linspace(0.001, 0.999, 200)
    salida = calibrador.transform(malla)
    assert salida.min() >= 0 and salida.max() <= 1
    assert np.all(np.diff(salida) >= -1e-9)
