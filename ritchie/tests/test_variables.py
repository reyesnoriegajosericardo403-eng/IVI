"""Pruebas de las variables: la prueba de causalidad es la más importante."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.features import build_features
from ritchie.features import indicators as ind


def test_ninguna_variable_mira_al_futuro(serie_con_patron):
    """Prueba de causalidad.

    Se reconstruyen las variables con la serie recortada hasta la fecha T y se
    comparan con las calculadas sobre la serie completa. Si algún cálculo
    usara información posterior, los valores cambiarían.
    """
    completo = build_features(serie_con_patron, {}).frame
    index = completo.index
    for fraction in (0.5, 0.7, 0.9):
        corte = index[int(len(index) * fraction)]
        recortado = build_features(serie_con_patron.slice_until(corte), {}).frame
        assert corte in recortado.index
        comunes = [c for c in completo.columns if c in recortado.columns]
        assert len(comunes) > 40, "se perdieron demasiadas columnas al recortar"
        a = completo.loc[corte, comunes]
        b = recortado.loc[corte, comunes]
        diferencias = [
            c for c in comunes
            if not (np.isnan(a[c]) and np.isnan(b[c])) and not np.isclose(a[c], b[c], rtol=1e-9, atol=1e-12)
        ]
        assert not diferencias, f"variables que cambian al recortar en {corte}: {diferencias[:5]}"


def test_variables_no_contienen_infinitos(dataset):
    valores = dataset["x"].to_numpy(dtype=float)
    assert np.isfinite(valores).all()


def test_todas_las_familias_del_spec_estan_presentes(dataset):
    familias = {dataset["matrix"].family_of(c) for c in dataset["x"].columns}
    for esperada in ("precio", "tecnico", "volatilidad", "volumen", "secuencia", "calendario"):
        assert esperada in familias


def test_cada_variable_tiene_descripcion(dataset):
    for column in dataset["x"].columns:
        assert dataset["matrix"].describe(column)


def test_rsi_dentro_de_rango():
    serie = pd.Series(100 * np.exp(np.cumsum(np.random.default_rng(0).normal(0, 0.02, 400))))
    valores = ind.rsi(serie, 14).dropna()
    assert valores.min() >= 0 and valores.max() <= 100


def test_rsi_satura_en_serie_siempre_creciente():
    serie = pd.Series(np.linspace(10, 30, 200))
    assert ind.rsi(serie, 14).dropna().iloc[-1] == pytest.approx(100.0)


def test_rachas_consecutivas_se_reinician():
    retornos = pd.Series([0.01, 0.01, 0.01, -0.01, 0.01])
    sube, baja = ind.consecutive_runs(retornos)
    assert list(sube) == [1, 2, 3, 0, 1]
    assert list(baja) == [0, 0, 0, 1, 0]


def test_percentil_rodante_solo_mira_hacia_atras():
    serie = pd.Series(list(range(100)))
    percentil = ind.rolling_percentile(serie, 30).dropna()
    # En una serie estrictamente creciente el valor de hoy siempre es el mayor.
    assert percentil.iloc[-1] == pytest.approx(1.0)


def test_dias_desde_extremo_cuenta_hacia_atras():
    serie = pd.Series([1, 5, 2, 3, 4])
    distancia = ind.days_since_extreme(serie, 5, "high").dropna()
    assert distancia.iloc[-1] == 3.0  # el máximo (5) fue hace 3 sesiones


def test_atr_es_positivo():
    rng = np.random.default_rng(1)
    close = pd.Series(100 * np.exp(np.cumsum(rng.normal(0, 0.02, 300))))
    high, low = close * 1.02, close * 0.98
    assert (ind.atr(high, low, close, 14).dropna() > 0).all()


def test_volatilidad_de_serie_constante_es_cero():
    retornos = pd.Series(np.zeros(100))
    assert ind.realized_volatility(retornos, 20).dropna().iloc[-1] == pytest.approx(0.0)


def test_columnas_constantes_se_descartan(serie_con_patron):
    matriz = build_features(serie_con_patron, {})
    for column in matriz.frame.columns:
        assert matriz.frame[column].dropna().nunique() > 1
