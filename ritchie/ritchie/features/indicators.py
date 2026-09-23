"""Indicadores técnicos, implementados sin mirar al futuro.

Cada función recibe series hasta el día t y devuelve el valor del día t.
Ninguna usa `shift(-k)` ni ventanas centradas: eso sería leer el futuro.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS = 252


def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window, min_periods=window).mean()


def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False, min_periods=span).mean()


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    """RSI con suavizado de Wilder."""
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    avg_gain = gain.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()
    avg_loss = loss.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    out = 100 - (100 / (1 + rs))
    # Sin pérdidas en la ventana el RSI satura en 100; sin ganancias, en 0.
    out = out.where(avg_loss > 0, 100.0)
    out = out.where(~((avg_gain == 0) & (avg_loss == 0)), 50.0)
    return out


def macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    line = ema(close, fast) - ema(close, slow)
    signal_line = line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return line, signal_line, line - signal_line


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    previous_close = close.shift(1)
    ranges = pd.concat(
        [high - low, (high - previous_close).abs(), (low - previous_close).abs()], axis=1
    )
    return ranges.max(axis=1)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14) -> pd.Series:
    return true_range(high, low, close).ewm(
        alpha=1 / window, adjust=False, min_periods=window
    ).mean()


def bollinger(close: pd.Series, window: int = 20, k: float = 2.0) -> tuple[pd.Series, pd.Series]:
    middle = sma(close, window)
    deviation = close.rolling(window, min_periods=window).std(ddof=0)
    upper = middle + k * deviation
    lower = middle - k * deviation
    width = (upper - lower) / middle.replace(0.0, np.nan)
    percent_b = (close - lower) / (upper - lower).replace(0.0, np.nan)
    return percent_b, width


def realized_volatility(returns: pd.Series, window: int, annualize: bool = True) -> pd.Series:
    vol = returns.rolling(window, min_periods=window).std(ddof=1)
    return vol * np.sqrt(TRADING_DAYS) if annualize else vol


def parkinson_volatility(high: pd.Series, low: pd.Series, window: int = 20) -> pd.Series:
    """Volatilidad de rango, más eficiente que la de cierres."""
    log_range = np.log((high / low).replace([np.inf, -np.inf], np.nan)) ** 2
    factor = 1.0 / (4.0 * np.log(2.0))
    return np.sqrt(factor * log_range.rolling(window, min_periods=window).mean() * TRADING_DAYS)


def downside_volatility(returns: pd.Series, window: int = 20) -> pd.Series:
    negatives = returns.where(returns < 0, 0.0)
    return np.sqrt((negatives**2).rolling(window, min_periods=window).mean() * TRADING_DAYS)


def rolling_percentile(series: pd.Series, window: int) -> pd.Series:
    """Percentil del valor actual dentro de su propia ventana histórica."""
    return series.rolling(window, min_periods=max(20, window // 4)).apply(
        lambda values: float((values[:-1] <= values[-1]).mean()) if len(values) > 1 else np.nan,
        raw=True,
    )


def consecutive_runs(series: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Sesiones consecutivas al alza y a la baja hasta el día t inclusive."""
    up = (series > 0).astype(int)
    down = (series < 0).astype(int)

    def _streak(flags: pd.Series) -> pd.Series:
        values = flags.to_numpy()
        out = np.zeros(len(values), dtype=float)
        streak = 0
        for i, value in enumerate(values):
            streak = streak + 1 if value else 0
            out[i] = streak
        return pd.Series(out, index=flags.index)

    return _streak(up), _streak(down)


def drawdown_from_peak(close: pd.Series, window: int | None = None) -> pd.Series:
    """Caída desde el máximo (de toda la historia previa o de una ventana)."""
    if window is None:
        peak = close.cummax()
    else:
        peak = close.rolling(window, min_periods=1).max()
    return close / peak - 1.0


def days_since_extreme(close: pd.Series, window: int, kind: str = "high") -> pd.Series:
    """Sesiones transcurridas desde el máximo/mínimo de la ventana."""

    def _distance(values: np.ndarray) -> float:
        index = int(np.argmax(values)) if kind == "high" else int(np.argmin(values))
        return float(len(values) - 1 - index)

    return close.rolling(window, min_periods=window).apply(_distance, raw=True)
