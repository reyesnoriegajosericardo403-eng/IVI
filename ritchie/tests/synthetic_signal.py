"""Fábricas de series de prueba con comportamiento conocido."""

from __future__ import annotations

import pandas as pd

from ritchie.data import synthetic
from ritchie.data.quality import assess, normalize_frame
from ritchie.data.schema import MarketData, utcnow


def _wrap(frame: pd.DataFrame, symbol: str, note: str) -> MarketData:
    frame = frame.copy()
    frame["raw_close"] = frame["close"]
    frame.attrs["adjusted"] = True
    cleaned, stats = normalize_frame(frame)
    cleaned.attrs["adjusted"] = True
    return MarketData(
        symbol=symbol,
        frame=cleaned,
        source="synthetic_test_fixture",
        retrieved_at=utcnow(),
        currency="USD",
        asset_class="synthetic",
        long_name=f"{symbol} (serie de prueba)",
        is_synthetic=True,
        quality=assess(cleaned, stats),
        notes=[note],
    )


def make_series(
    n: int = 2600,
    seed: int = 7,
    symbol: str = "SIGNAL",
    effect: float = 1.2,
    shock_sigmas: float = 1.25,
) -> MarketData:
    """Serie con una ventaja estadística real, grande y frecuente.

    Los valores por defecto son deliberadamente generosos: estas pruebas
    verifican que el motor **encuentra un patrón evidente**, no qué tan fino
    es su umbral de detección. Un patrón sutil exigiría series de décadas y
    convertiría la suite en algo que nadie ejecuta.
    """
    return _wrap(
        synthetic.pattern_series(n, seed, effect=effect, shock_sigmas=shock_sigmas),
        symbol,
        "Serie de prueba con una ventaja estadística incrustada a propósito.",
    )


def make_pure_noise(n: int = 2600, seed: int = 11, symbol: str = "NOISE") -> MarketData:
    """Paseo aleatorio puro: no hay nada que descubrir."""
    return _wrap(
        synthetic.random_walk(n, seed),
        symbol,
        "Paseo aleatorio puro: no existe ningún patrón que descubrir.",
    )
