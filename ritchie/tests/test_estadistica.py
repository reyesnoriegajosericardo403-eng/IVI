"""Pruebas de las herramientas que distinguen una ventaja real de la suerte."""

from __future__ import annotations

import numpy as np
import pytest

from ritchie.statistics import (
    benjamini_hochberg,
    binomial_event_test,
    block_bootstrap_ci,
    bootstrap_proportion_ci,
    cohens_h,
    effect_size_label,
    paired_brier_test,
    permutation_auc_test,
    reality_check,
)


def _mundo(con_senal: bool, seed: int, n: int = 2500):
    """Mundo de juguete con once modelos, uno de ellos bueno (o ninguno).

    `n = 2500` son unas diez años de sesiones: el tamaño de muestra con el que
    realmente se trabaja. Con muestras mucho más cortas ninguna prueba
    honesta tendría poder, y fingir lo contrario sería el error que este
    módulo existe para evitar.
    """
    rng = np.random.default_rng(seed)
    verdadera = (
        np.where(rng.random(n) < 0.12, 0.30, 0.05) if con_senal else np.full(n, 0.08)
    )
    y = (rng.random(n) < verdadera).astype(float)
    referencia = np.full(n, y.mean())
    candidatos = {
        f"ruido{i}": np.clip(referencia + rng.normal(0, 0.02, n), 0.001, 0.999) for i in range(10)
    }
    candidatos["basura"] = rng.uniform(0.02, 0.98, n)
    if con_senal:
        candidatos["bueno"] = verdadera
    return y, candidatos, referencia


def test_prueba_de_realidad_no_inventa_ganadores():
    """Sin ventaja real, el mejor de once modelos no debe pasar el filtro."""
    p_valores = []
    for seed in range(5):
        y, candidatos, referencia = _mundo(False, 100 + seed)
        p_valores.append(reality_check(y, candidatos, referencia, seed=seed)["p_valor"])
    assert min(p_valores) > 0.05, p_valores


def test_prueba_de_realidad_encuentra_la_ventaja_real():
    for seed in range(4):
        y, candidatos, referencia = _mundo(True, 200 + seed)
        resultado = reality_check(y, candidatos, referencia, seed=seed)
        assert resultado["p_valor"] < 0.05, (seed, resultado["p_valor"])
        assert resultado["mejor"] == "bueno"


def test_prueba_de_realidad_no_se_deja_arrastrar_por_un_modelo_horrible():
    """Un modelo pésimo y ruidoso no debe destruir el poder de la prueba."""
    y, candidatos, referencia = _mundo(True, 55)
    sin_basura = {k: v for k, v in candidatos.items() if k != "basura"}
    con = reality_check(y, candidatos, referencia, seed=1)["p_valor"]
    sin = reality_check(y, sin_basura, referencia, seed=1)["p_valor"]
    assert con < 0.05 and sin < 0.05
    assert abs(con - sin) < 0.05


def test_brier_pareado_distingue_habilidad_de_ruido():
    y, candidatos, referencia = _mundo(True, 77)
    bueno = paired_brier_test(y, candidatos["bueno"], referencia, seed=1)
    assert bueno.p_value < 0.05 and bueno.statistic > 0
    ruido = paired_brier_test(y, candidatos["ruido0"], referencia, seed=1)
    assert ruido.p_value > 0.05


def test_intervalo_bootstrap_contiene_la_media():
    rng = np.random.default_rng(0)
    valores = rng.normal(0.01, 0.1, 800)
    media, bajo, alto = block_bootstrap_ci(valores, n_boot=800, block=10, seed=1)
    assert bajo < media < alto
    assert media == pytest.approx(valores.mean())


def test_prueba_de_permutacion_de_auc():
    rng = np.random.default_rng(1)
    n = 600
    p = rng.uniform(0, 1, n)
    y_informativo = (rng.random(n) < p).astype(float)
    assert permutation_auc_test(y_informativo, p, n_permutations=400, seed=1).p_value < 0.05
    y_aleatorio = (rng.random(n) < 0.3).astype(float)
    assert permutation_auc_test(y_aleatorio, rng.random(n), n_permutations=400, seed=1).p_value > 0.05


def test_binomial_detecta_una_frecuencia_distinta():
    assert binomial_event_test(200, 1000, 0.05).p_value < 0.001
    assert binomial_event_test(52, 1000, 0.05).p_value > 0.5


def test_binomial_sin_observaciones_no_se_rompe():
    resultado = binomial_event_test(0, 0, 0.05)
    assert resultado.p_value == 1.0 and resultado.n == 0


def test_tamano_de_efecto_y_su_lectura():
    assert cohens_h(0.5, 0.5) == pytest.approx(0.0)
    assert cohens_h(0.9, 0.1) > 1.0
    assert effect_size_label(0.05) == "insignificante"
    assert effect_size_label(0.3) == "moderado"
    assert effect_size_label(1.0) == "muy grande"


def test_benjamini_hochberg_controla_falsos_hallazgos():
    assert benjamini_hochberg([0.001, 0.2, 0.5, 0.9], alpha=0.10) == [True, False, False, False]
    # Veinte p-valores aleatorios: no debería sobrevivir ninguno.
    rng = np.random.default_rng(3)
    assert not any(benjamini_hochberg(list(rng.uniform(0.06, 1.0, 20)), alpha=0.10))
    assert benjamini_hochberg([], alpha=0.1) == []


def test_intervalo_de_wilson_es_valido():
    bajo, alto = bootstrap_proportion_ci(5, 100)
    assert 0 <= bajo < 0.05 < alto <= 1
    bajo, alto = bootstrap_proportion_ci(0, 30)
    assert bajo == 0.0 and alto > 0
