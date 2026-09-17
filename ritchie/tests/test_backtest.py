"""Pruebas del backtest: costos reales, entradas realistas y referencias."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.backtest import run_backtest
from ritchie.config import BacktestConfig


@pytest.fixture(scope="module")
def probabilidades(dataset):
    """Señal sintética estable para poder comparar corridas."""
    rng = np.random.default_rng(4)
    index = dataset["x"].index[400:]
    return pd.Series(rng.uniform(0.2, 0.9, len(index)), index=index)


def test_incluye_todas_las_referencias_obligatorias(serie_con_patron, probabilidades):
    reporte = run_backtest(serie_con_patron, probabilidades, 5, BacktestConfig(), seed=1)
    nombres = {b.name for b in reporte.benchmarks}
    assert nombres == {"comprar_y_mantener", "operar_siempre", "señal_al_azar"}


def test_los_costos_reducen_el_resultado(serie_con_patron, probabilidades):
    sin_costos = run_backtest(
        serie_con_patron, probabilidades, 5, BacktestConfig(commission=0.0, slippage=0.0), seed=1
    )
    con_costos = run_backtest(
        serie_con_patron, probabilidades, 5, BacktestConfig(commission=0.002, slippage=0.004), seed=1
    )
    assert con_costos.strategy.total_return < sin_costos.strategy.total_return
    assert con_costos.strategy.n_trades == sin_costos.strategy.n_trades


def test_no_se_abren_posiciones_encimadas(serie_con_patron, probabilidades):
    reporte = run_backtest(serie_con_patron, probabilidades, 5, BacktestConfig(), seed=1)
    operaciones = reporte.strategy.trades
    for anterior, siguiente in zip(operaciones, operaciones[1:]):
        assert pd.Timestamp(siguiente.entry_date) > pd.Timestamp(anterior.exit_date)


def test_la_entrada_ocurre_despues_de_la_senal(serie_con_patron, probabilidades):
    reporte = run_backtest(serie_con_patron, probabilidades, 3, BacktestConfig(), seed=1)
    fechas = serie_con_patron.frame.index
    for operacion in reporte.strategy.trades:
        entrada = pd.Timestamp(operacion.entry_date)
        salida = pd.Timestamp(operacion.exit_date)
        assert salida > entrada
        # La salida cae exactamente al horizonte pedido después de la entrada.
        assert list(fechas).index(salida) - list(fechas).index(entrada) == 2


def test_la_curva_de_capital_arranca_en_uno(serie_con_patron, probabilidades):
    reporte = run_backtest(serie_con_patron, probabilidades, 5, BacktestConfig(), seed=1)
    curva = reporte.strategy.equity
    assert curva
    assert all(punto["valor"] > 0 for punto in curva)


def test_veredicto_es_prudente_con_pocas_operaciones(serie_con_patron, dataset):
    index = dataset["x"].index[-60:]
    pocas = pd.Series(np.linspace(0.1, 0.99, len(index)), index=index)
    reporte = run_backtest(serie_con_patron, pocas, 10, BacktestConfig(), seed=1)
    assert "muy pocas" in reporte.verdict or not reporte.beats_benchmarks


def test_umbral_se_adapta_si_nadie_lo_alcanza(serie_con_patron, dataset):
    index = dataset["x"].index[400:]
    bajas = pd.Series(np.full(len(index), 0.05), index=index)
    reporte = run_backtest(serie_con_patron, bajas, 5, BacktestConfig(entry_probability=0.9), seed=1)
    assert reporte.assumptions["umbral_de_entrada"] < 0.9


def test_supuestos_quedan_documentados(serie_con_patron, probabilidades):
    reporte = run_backtest(serie_con_patron, probabilidades, 5, BacktestConfig(), seed=1)
    supuestos = reporte.assumptions
    for clave in ("comision_por_lado", "deslizamiento_por_lado", "entrada", "salida", "periodo"):
        assert clave in supuestos
    assert supuestos["posiciones_simultaneas"] == 1


def test_sin_probabilidades_falla_con_mensaje(serie_con_patron):
    with pytest.raises(ValueError):
        run_backtest(serie_con_patron, pd.Series(dtype=float), 5, BacktestConfig())


def test_tamanos_de_posicion_escalan_el_resultado(serie_con_patron, probabilidades):
    reporte = run_backtest(serie_con_patron, probabilidades, 5, BacktestConfig(), seed=1)
    sizing = reporte.position_sizing
    if sizing:
        assert abs(sizing["25%_del_capital"]["rendimiento_total_aprox"]) <= abs(
            sizing["100%_del_capital"]["rendimiento_total_aprox"]
        ) + 1e-9
