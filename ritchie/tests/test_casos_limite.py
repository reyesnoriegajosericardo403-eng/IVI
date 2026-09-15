"""Casos límite: lo que debe pasar cuando los datos no cooperan."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.data.quality import assess, normalize_frame
from ritchie.data.schema import MarketData, utcnow
from ritchie.features import TargetSpec, align_xy, build_features, build_target
from ritchie.models import build_candidates
from ritchie.models.base import SeriesContext
from ritchie.simulation import run_scenarios


def _market(closes, symbol="LIMITE"):
    n = len(closes)
    index = pd.bdate_range(end="2026-01-01", periods=n)
    frame = pd.DataFrame(
        {
            "open": closes, "high": [c * 1.005 for c in closes], "low": [c * 0.995 for c in closes],
            "close": closes, "raw_close": closes, "volume": np.full(n, 1e6),
        },
        index=index,
    )
    frame.attrs["adjusted"] = True
    clean, stats = normalize_frame(frame)
    clean.attrs["adjusted"] = True
    return MarketData(
        symbol=symbol, frame=clean, source="synthetic_test_fixture", retrieved_at=utcnow(),
        is_synthetic=True, quality=assess(clean, stats),
    )


def test_serie_plana_no_produce_variables_utiles():
    market = _market([100.0] * 400)
    matriz = build_features(market, {})
    # Casi todo es constante: las columnas se descartan y queda muy poco.
    assert len(matriz.frame.columns) < 25
    assert matriz.skipped


def test_serie_plana_nunca_alcanza_el_objetivo():
    market = _market([100.0] * 400)
    objetivo = build_target(market, TargetSpec(1, 0.04, "up", "close")).dropna()
    assert objetivo.sum() == 0


def test_serie_muy_corta_no_rompe_las_variables():
    market = _market(list(np.linspace(10, 12, 80)))
    matriz = build_features(market, {})
    assert isinstance(matriz.frame, pd.DataFrame)
    x, y, _ = align_xy(matriz.frame, build_target(market, TargetSpec(1, 0.04, "up", "close")))
    assert len(x) < 80


def test_umbral_imposible_da_probabilidad_practicamente_nula(serie_con_patron):
    spec = TargetSpec(1, 0.95, "up", "close")
    ctx = SeriesContext(serie_con_patron, spec, seed=1, n_paths=4000)
    reporte = run_scenarios(serie_con_patron, spec, ctx, n_paths=4000)
    assert reporte.probability_target < 0.01


def test_umbral_trivial_da_probabilidad_muy_alta(serie_con_patron):
    spec = TargetSpec(20, 0.0001, "up", "close")
    ctx = SeriesContext(serie_con_patron, spec, seed=1, n_paths=4000)
    reporte = run_scenarios(serie_con_patron, spec, ctx, n_paths=4000)
    assert reporte.probability_target > 0.3


def test_escenarios_sin_historia_suficiente_fallan_con_mensaje():
    market = _market(list(np.linspace(10, 11, 40)))
    spec = TargetSpec(1, 0.04, "up", "close")
    ctx = SeriesContext(market, spec, seed=1, n_paths=1000)
    with pytest.raises(ValueError):
        run_scenarios(market, spec, ctx, n_paths=1000)


def test_modelos_toleran_entrenamiento_diminuto(serie_con_patron):
    spec = TargetSpec(1, 0.04, "up", "close")
    matriz = build_features(serie_con_patron, {})
    x, y, _ = align_xy(matriz.frame, build_target(serie_con_patron, spec))
    ctx = SeriesContext(serie_con_patron, spec, seed=1, n_paths=200)
    for modelo in build_candidates("rapido"):
        modelo.fit(x.iloc[:80], y.iloc[:80], ctx)
        probabilidades = modelo.predict_proba(x.iloc[80:90], ctx)
        assert np.isfinite(probabilidades).all(), modelo.name
        assert (probabilidades >= 0).all() and (probabilidades <= 1).all(), modelo.name


def test_evento_que_nunca_ocurrio_no_produce_probabilidad_cero_absoluta(serie_con_patron):
    """Aunque el evento jamás haya pasado, decir 0% sería una mentira."""
    from ritchie.models.baselines import BaseRateModel

    spec = TargetSpec(1, 0.04, "up", "close")
    matriz = build_features(serie_con_patron, {})
    x, y, _ = align_xy(matriz.frame, build_target(serie_con_patron, spec))
    ctx = SeriesContext(serie_con_patron, spec, seed=1, n_paths=200)
    y_cero = pd.Series(np.zeros(len(y), dtype=int), index=y.index)
    modelo = BaseRateModel().fit(x, y_cero, ctx)
    probabilidad = modelo.predict_proba(x.iloc[:1], ctx)[0]
    assert 0 < probabilidad < 0.01


def test_datos_con_hueco_largo_se_reportan():
    fechas = list(pd.bdate_range("2024-01-01", periods=50)) + list(
        pd.bdate_range("2024-09-01", periods=50)
    )
    frame = pd.DataFrame(
        {"open": 10.0, "high": 10.1, "low": 9.9, "close": 10.0}, index=pd.DatetimeIndex(fechas)
    )
    clean, stats = normalize_frame(frame)
    reporte = assess(clean, stats)
    assert reporte.long_gaps >= 1
    assert reporte.max_calendar_gap_days > 30


def test_valores_no_finitos_no_llegan_a_los_modelos(serie_con_patron):
    matriz = build_features(serie_con_patron, {})
    valores = matriz.frame.to_numpy(dtype=float)
    assert not np.isinf(valores).any()
