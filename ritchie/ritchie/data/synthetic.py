"""Generadores de series simuladas, SIEMPRE etiquetadas como tales.

Existen para tres cosas concretas y para ninguna más:

1. probar el motor de punta a punta sin depender de la red,
2. verificar que el sistema **encuentra** un patrón cuando de verdad existe
   (un motor que solo sabe decir "no hay señal" es tan inútil como uno que
   siempre dice que sí),
3. permitir una demostración honesta de la interfaz.

Toda serie producida aquí viaja con `is_synthetic=True` y la interfaz lo
anuncia en grande. Nunca se presenta como mercado real.
"""

from __future__ import annotations

import hashlib

import numpy as np
import pandas as pd

TRADING_DAYS = 252


def stable_seed(symbol: str) -> int:
    """Semilla determinista entre corridas (el hash() de Python no lo es)."""
    digest = hashlib.sha256(symbol.upper().encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big")


def _ohlcv(returns: np.ndarray, sigma: float, rng: np.random.Generator, start: float = 45.0) -> pd.DataFrame:
    n = returns.size
    close = start * np.exp(np.cumsum(returns))
    intraday = np.abs(rng.normal(0, sigma, n)) + 0.3 * sigma
    open_ = close * (1 + rng.normal(0, 0.5 * sigma, n))
    high = np.maximum(open_, close) * (1 + intraday)
    low = np.minimum(open_, close) * (1 - intraday)
    volume = np.abs(rng.lognormal(15.0, 0.45, n) * (1 + 6 * np.abs(returns)))
    index = pd.bdate_range(end=pd.Timestamp.utcnow().tz_localize(None).normalize(), periods=n)
    frame = pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "adj_close": close,
            "volume": volume.round(),
        },
        index=index,
    )
    frame.attrs["adjusted"] = True
    return frame


def garch_series(sessions: int, seed: int) -> pd.DataFrame:
    """Serie con agrupamiento de volatilidad, colas pesadas y saltos.

    Cada semilla produce un activo con su propio carácter (tranquilo o
    salvaje), siempre el mismo para la misma semilla.
    """
    rng = np.random.default_rng(seed)
    personality = np.random.default_rng(seed)
    daily_sigma = float(personality.uniform(0.012, 0.055))
    drift = float(personality.normal(0.0004, 0.0006))
    jump_rate = float(personality.uniform(0.004, 0.02))
    tail_df = float(personality.uniform(3.5, 7.0))

    alpha, beta = 0.09, 0.88
    omega = daily_sigma**2 * (1 - alpha - beta)
    variance = daily_sigma**2
    shocks = rng.standard_t(df=tail_df, size=sessions) / np.sqrt(
        tail_df / max(1e-9, tail_df - 2)
    )

    returns = np.empty(sessions)
    for i in range(sessions):
        returns[i] = drift + np.sqrt(variance) * shocks[i]
        variance = omega + alpha * (returns[i] - drift) ** 2 + beta * variance

    jumps = rng.random(sessions) < jump_rate
    returns[jumps] += rng.normal(0, 3.0 * daily_sigma, int(jumps.sum()))
    return _ohlcv(returns, daily_sigma, rng)


def pattern_series(
    sessions: int,
    seed: int,
    effect: float = 0.9,
    base_sigma: float = 0.030,
    shock_sigmas: float = 2.0,
) -> pd.DataFrame:
    """Serie con una ventaja estadística REAL incrustada a propósito.

    Regla del generador: después de una caída fuerte (peor que `shock_sigmas`
    desviaciones típicas) el día siguiente trae una deriva positiva extra y
    más volatilidad. Es reversión exagerada, del tamaño que un motor honesto
    debería detectar sin dudar —y que en un mercado real casi nunca existe
    con esta claridad.

    `effect` gradúa el tamaño de la ventaja y `shock_sigmas` su frecuencia:
    bajarlo hace que el patrón aparezca en más días de la muestra, que es lo
    que necesita una prueba automática para tener poder estadístico sin
    depender de series larguísimas.
    """
    rng = np.random.default_rng(seed)
    returns = np.zeros(sessions)
    previous = 0.0
    for i in range(sessions):
        shocked = previous < -shock_sigmas * base_sigma
        drift = effect * base_sigma if shocked else -0.02 * base_sigma
        local_sigma = base_sigma * (1.6 if shocked else 1.0)
        value = drift + local_sigma * rng.standard_t(df=6) / np.sqrt(6 / 4)
        returns[i] = value
        previous = value
    return _ohlcv(returns, base_sigma, rng, start=50.0)


def random_walk(sessions: int, seed: int, sigma: float = 0.025) -> pd.DataFrame:
    """Paseo aleatorio puro: no hay absolutamente nada que descubrir."""
    rng = np.random.default_rng(seed)
    returns = rng.normal(0.0002, sigma, sessions)
    return _ohlcv(returns, sigma, rng, start=50.0)
