"""Pruebas del objetivo: la única parte del sistema que puede ver el futuro."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.features.targets import (
    TargetSpec,
    align_xy,
    build_target,
    forward_extreme,
    forward_return,
    prediction_row,
    realized_summary,
)


def test_ultimas_sesiones_quedan_sin_etiqueta(serie_con_patron):
    for horizonte in (1, 3, 5, 10):
        spec = TargetSpec(horizon=horizonte, threshold=0.04, direction="up", mode="close")
        objetivo = build_target(serie_con_patron, spec)
        assert objetivo.iloc[-horizonte:].isna().all()
        assert objetivo.iloc[: -horizonte].notna().all()


def test_etiqueta_coincide_con_el_calculo_manual(serie_con_patron):
    spec = TargetSpec(horizon=3, threshold=0.05, direction="up", mode="close")
    objetivo = build_target(serie_con_patron, spec)
    close = serie_con_patron.frame["close"]
    for posicion in (100, 500, 900):
        fecha = close.index[posicion]
        cambio = close.iloc[posicion + 3] / close.iloc[posicion] - 1
        assert objetivo.loc[fecha] == float(cambio >= 0.05)


def test_modo_touch_usa_el_camino_no_solo_el_cierre(serie_con_patron):
    cerrado = build_target(serie_con_patron, TargetSpec(5, 0.04, "up", "close")).dropna()
    tocado = build_target(serie_con_patron, TargetSpec(5, 0.04, "up", "touch")).dropna()
    # Tocar el nivel en el camino siempre es al menos tan frecuente como cerrar arriba.
    assert tocado.mean() >= cerrado.mean()


def test_forward_extreme_para_horizonte_uno_es_el_dia_siguiente():
    close = pd.Series([10.0, 11.0, 12.0, 13.0], index=pd.bdate_range("2024-01-01", periods=4))
    high = pd.Series([10.5, 11.5, 12.5, 13.5], index=close.index)
    extremo = forward_extreme(high, close, 1, "high")
    assert extremo.iloc[0] == pytest.approx(11.5 / 10.0 - 1)
    assert np.isnan(extremo.iloc[-1])


def test_forward_extreme_toma_el_maximo_de_la_ventana():
    close = pd.Series([10.0] * 5, index=pd.bdate_range("2024-01-01", periods=5))
    high = pd.Series([10.0, 12.0, 11.0, 15.0, 9.0], index=close.index)
    extremo = forward_extreme(high, close, 2, "high")
    assert extremo.iloc[0] == pytest.approx(12.0 / 10.0 - 1)  # max(12, 11)
    assert extremo.iloc[1] == pytest.approx(15.0 / 10.0 - 1)  # max(11, 15)


def test_forward_return_desplaza_correctamente():
    close = pd.Series([10.0, 11.0, 12.1], index=pd.bdate_range("2024-01-01", periods=3))
    cambios = forward_return(close, 1)
    assert cambios.iloc[0] == pytest.approx(0.10)
    assert cambios.iloc[1] == pytest.approx(0.10)
    assert np.isnan(cambios.iloc[-1])


def test_direccion_rango_es_simetrica(serie_con_patron):
    spec = TargetSpec(horizon=5, threshold=0.03, direction="range", mode="close")
    objetivo = build_target(serie_con_patron, spec).dropna()
    assert set(objetivo.unique()).issubset({0.0, 1.0})
    assert 0 < objetivo.mean() < 1


def test_align_xy_deja_solo_filas_completas(dataset):
    x, y = dataset["x"], dataset["y"]
    assert not x.isna().any().any()
    assert not y.isna().any()
    assert len(x) == len(y)
    assert set(y.unique()).issubset({0, 1})


def test_prediction_row_es_la_ultima_fila_completa(dataset):
    fecha, fila = prediction_row(dataset["matrix"].frame)
    assert fecha is not None
    assert not fila.isna().any()
    assert fecha >= dataset["x"].index[-1]


def test_spec_invalida_se_rechaza():
    with pytest.raises(ValueError):
        TargetSpec(horizon=0, threshold=0.04, direction="up", mode="close")
    with pytest.raises(ValueError):
        TargetSpec(horizon=1, threshold=-0.01, direction="up", mode="close")
    with pytest.raises(ValueError):
        TargetSpec(horizon=1, threshold=0.04, direction="lateral", mode="close")
    with pytest.raises(ValueError):
        TargetSpec(horizon=1, threshold=0.04, direction="up", mode="promedio")


def test_descripcion_en_espanol_es_legible():
    assert "próxima sesión" in TargetSpec(1, 0.04, "up", "close").describe()
    assert "algún momento" in TargetSpec(5, 0.04, "up", "touch").describe()
    assert "baje" in TargetSpec(5, 0.04, "down", "close").describe()
    assert "±" in TargetSpec(5, 0.03, "range", "close").describe()


def test_resumen_historico_reporta_tasa_base(serie_con_patron, spec):
    resumen = realized_summary(serie_con_patron, spec)
    assert resumen["observations"] > 1000
    assert 0 < resumen["base_rate"] < 1
    assert resumen["events"] == pytest.approx(resumen["base_rate"] * resumen["observations"], abs=1)
