"""Pruebas de confianza, "sin señal" y explicación en lenguaje simple."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.config import DecisionConfig
from ritchie.decision import assess_confidence, build_narrative, evaluate_signal, regime_novelty
from ritchie.decision.explain import probability_in_words, probability_words_simple
from ritchie.decision.phrases import PHRASES, describe

BUENOS = dict(
    model_selected=True, calibration_ece=0.01, calibration_slope=1.0, n_oos=1200, n_events=180,
    analog_evidence={"vecinos": 80, "distancia_mediana": 0.3}, model_spread=0.02,
    novelty_percentile=0.5, data_quality=0.98, test_brier_skill=0.03, decision=DecisionConfig(),
)


def test_confianza_alta_con_todo_a_favor():
    reporte = assess_confidence(**BUENOS)
    assert reporte.level in ("alta", "muy_alta")
    assert 0 <= reporte.score <= 1
    assert len(reporte.factors) == 7


def test_confianza_baja_si_la_calibracion_es_mala():
    malo = dict(BUENOS, calibration_ece=0.25, calibration_slope=0.4)
    assert assess_confidence(**malo).score < assess_confidence(**BUENOS).score


def test_confianza_baja_con_poca_evidencia():
    malo = dict(BUENOS, n_oos=60, n_events=4)
    assert assess_confidence(**malo).score < assess_confidence(**BUENOS).score


def test_confianza_baja_si_los_modelos_no_coinciden():
    malo = dict(BUENOS, model_spread=0.30)
    assert assess_confidence(**malo).score < assess_confidence(**BUENOS).score


def test_sin_modelo_util_la_confianza_es_nula():
    reporte = assess_confidence(**dict(BUENOS, model_selected=False))
    assert reporte.score == 0.0
    assert reporte.level == "muy_baja"


def test_cada_factor_de_confianza_explica_su_numero():
    for factor in assess_confidence(**BUENOS).factors:
        assert factor.detail
        assert 0 <= factor.score <= 1


def test_novedad_de_regimen_detecta_un_dia_extremo(dataset):
    x = dataset["x"]
    normal = regime_novelty(x, x.iloc[len(x) // 2])
    extremo = regime_novelty(x, x.iloc[:-1].abs().max() * 10)
    assert normal["percentil"] is not None
    assert extremo["percentil"] >= normal["percentil"]
    assert extremo["percentil"] > 0.95


SENAL_OK = dict(
    n_observations=1500, n_oos=900, n_events=120, selected_model="garch", rejection_reasons=[],
    calibration_ece=0.02, model_spread=0.03, novelty_percentile=0.6, data_quality=0.97,
    data_issues=[], probability=0.30, base_rate=0.10, is_synthetic=False, decision=DecisionConfig(),
)


def test_hay_senal_cuando_todo_esta_en_orden():
    assert evaluate_signal(**SENAL_OK).has_signal is True


@pytest.mark.parametrize(
    "cambio,clave",
    [
        ({"n_observations": 100}, "datos_insuficientes"),
        ({"n_oos": 20}, "validacion_insuficiente"),
        ({"n_events": 3}, "eventos_insuficientes"),
        ({"selected_model": None}, "sin_modelo_util"),
        ({"calibration_ece": 0.3}, "calibracion_pobre"),
        ({"model_spread": 0.4}, "modelos_en_desacuerdo"),
        ({"novelty_percentile": 0.995}, "regimen_inusual"),
        ({"data_quality": 0.4}, "calidad_de_datos"),
        ({"is_synthetic": True}, "datos_simulados"),
    ],
)
def test_cada_regla_de_bloqueo_dispara(cambio, clave):
    decision = evaluate_signal(**dict(SENAL_OK, **cambio))
    assert decision.has_signal is False
    assert clave in {b.key for b in decision.blockers}
    assert decision.message


def test_sin_ventaja_sobre_la_tasa_base_no_hay_senal():
    decision = evaluate_signal(**dict(SENAL_OK, probability=0.101, base_rate=0.10))
    assert decision.has_signal is False
    assert "sin_ventaja" in {b.key for b in decision.blockers}


def test_cada_bloqueo_trae_motivo_detalle_y_remedio():
    decision = evaluate_signal(**dict(SENAL_OK, selected_model=None))
    for bloqueo in decision.blockers:
        assert bloqueo.reason and bloqueo.detail and bloqueo.remedy


# ------------------------------------------------------------- explicación
def test_probabilidad_en_palabras_cuenta_dias():
    assert "en 79" in probability_in_words(0.79)
    assert "21" in probability_in_words(0.79)
    assert probability_words_simple(0.5) == "una moneda al aire"
    assert probability_words_simple(0.02) == "muy poco probable"


def test_frases_no_contienen_jerga(dataset):
    fila = dataset["x"].iloc[-1]
    jerga = ("z-score", "percentil 252", "GARCH", "logit", "Brier", "AUC")
    for variable in list(PHRASES)[:40]:
        if variable not in fila.index:
            continue
        texto = describe(variable, float(fila[variable]))
        assert texto
        assert not any(palabra in texto for palabra in jerga), (variable, texto)


def test_frase_desconocida_cae_en_la_descripcion_generica():
    assert describe("variable_inventada", 1.0, "una descripción de respaldo") == "una descripción de respaldo"


def test_valor_no_finito_no_rompe_la_frase():
    assert describe("ret_5d", float("nan"), "respaldo") == "respaldo"


def test_narrativa_con_senal_menciona_la_probabilidad(dataset):
    narrativa = build_narrative(
        symbol="TEST", target_description="que suba 4% o más al cierre de la próxima sesión",
        probability=0.42, base_rate=0.10, opposite_probability=0.08, confidence_label="alta",
        has_signal=True, blockers=[], contributions=[], today=dataset["x"].iloc[-1],
        descriptions=dataset["matrix"].descriptions, analog_evidence={"vecinos": 50, "aciertos": 21},
        scenario=None, horizon_text="la próxima sesión", is_synthetic=False,
    )
    assert "42%" in narrativa.headline or "42%" in narrativa.simple
    assert "100" in narrativa.grandma
    assert narrativa.means and narrativa.does_not_mean
    assert "garantía" in narrativa.disclaimer


def test_narrativa_sin_senal_no_inventa_numeros(dataset):
    narrativa = build_narrative(
        symbol="TEST", target_description="que suba 4% o más", probability=None, base_rate=0.10,
        opposite_probability=None, confidence_label="muy baja", has_signal=False,
        blockers=[{"clave": "sin_modelo_util", "motivo": "Ningún modelo aportó información",
                   "detalle": "d", "remedio": "r"}],
        contributions=[], today=dataset["x"].iloc[-1], descriptions={}, analog_evidence=None,
        scenario=None, horizon_text="la próxima sesión", is_synthetic=False,
    )
    assert "%" not in narrativa.headline
    assert "no" in narrativa.headline.lower()
    assert any("10%" in m for m in narrativa.means)  # la tasa base sí es un hecho


def test_narrativa_simulada_avisa_en_grande(dataset):
    narrativa = build_narrative(
        symbol="TEST", target_description="que suba 4%", probability=0.5, base_rate=0.1,
        opposite_probability=0.1, confidence_label="alta", has_signal=True, blockers=[],
        contributions=[], today=dataset["x"].iloc[-1], descriptions={}, analog_evidence=None,
        scenario=None, horizon_text="mañana", is_synthetic=True,
    )
    assert any("SIMULADA" in texto.upper() for texto in narrativa.does_not_mean)
