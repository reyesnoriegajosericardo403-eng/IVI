"""Definición del objetivo a predecir.

Este es el único módulo del sistema autorizado a mirar hacia adelante, porque
es donde se construye la etiqueta (lo que realmente pasó después). Las filas
sin futuro completo quedan en NaN y jamás entran al entrenamiento.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from ..data.schema import MarketData

#: Cómo se mide que el activo "llegó" al objetivo.
#:   close → el cierre de la sesión t+H frente al cierre de hoy.
#:   touch → en algún momento del camino tocó el nivel objetivo.
MODES = ("close", "touch")
DIRECTIONS = ("up", "down", "range")


@dataclass(frozen=True)
class TargetSpec:
    """Qué pregunta responde el modelo, en términos exactos."""

    horizon: int = 1
    threshold: float = 0.04
    direction: str = "up"
    mode: str = "close"

    def __post_init__(self) -> None:
        if self.horizon < 1:
            raise ValueError("El horizonte debe ser de al menos una sesión.")
        if self.direction not in DIRECTIONS:
            raise ValueError(f"Dirección inválida: {self.direction}")
        if self.mode not in MODES:
            raise ValueError(f"Modo inválido: {self.mode}")
        if self.direction != "range" and self.threshold <= 0:
            raise ValueError("El umbral debe ser positivo.")
        if self.direction == "range" and self.threshold <= 0:
            raise ValueError("El ancho del rango debe ser positivo.")

    @property
    def key(self) -> str:
        return f"{self.direction}_{self.threshold:.4f}_{self.horizon}_{self.mode}"

    def describe(self) -> str:
        percent = f"{self.threshold * 100:.2f}".rstrip("0").rstrip(".")
        sessions = "la próxima sesión" if self.horizon == 1 else f"las próximas {self.horizon} sesiones"
        if self.direction == "up":
            movement = f"suba {percent}% o más"
        elif self.direction == "down":
            movement = f"baje {percent}% o más"
        else:
            return f"que se quede dentro de ±{percent}% durante {sessions}"
        if self.mode == "touch":
            return f"que {movement} en algún momento de {sessions}"
        return f"que {movement} al cierre de {sessions}"

    def to_dict(self) -> dict:
        return {
            "horizon": self.horizon,
            "threshold": self.threshold,
            "direction": self.direction,
            "mode": self.mode,
            "description": self.describe(),
        }


def forward_return(close: pd.Series, horizon: int) -> pd.Series:
    """Rendimiento de cierre a cierre entre t y t+H. NaN en las últimas H filas."""
    return close.shift(-horizon) / close - 1.0


def forward_extreme(series: pd.Series, close: pd.Series, horizon: int, kind: str) -> pd.Series:
    """Máximo (o mínimo) del camino t+1..t+H, expresado como rendimiento.

    Se calcula invirtiendo la serie para que la ventana rodante "hacia
    adelante" siga siendo una ventana rodante estándar, y se desplaza para que
    la fila t solo vea de t+1 en adelante.
    """
    reversed_series = series.iloc[::-1]
    if kind == "high":
        rolled = reversed_series.rolling(horizon, min_periods=horizon).max()
    else:
        rolled = reversed_series.rolling(horizon, min_periods=horizon).min()
    forward = rolled.iloc[::-1].shift(-1)
    return forward / close - 1.0


def build_target(market: MarketData, spec: TargetSpec) -> pd.Series:
    """Etiqueta binaria 0/1 del evento descrito por `spec`."""
    frame = market.frame
    close = frame["close"]

    if spec.direction == "range":
        change = forward_return(close, spec.horizon)
        label = (change.abs() <= spec.threshold).astype(float)
        return label.where(change.notna()).rename(spec.key)

    if spec.mode == "close":
        change = forward_return(close, spec.horizon)
        if spec.direction == "up":
            label = (change >= spec.threshold).astype(float)
        else:
            label = (change <= -spec.threshold).astype(float)
        return label.where(change.notna()).rename(spec.key)

    # modo "touch": el camino intradía decide.
    if spec.direction == "up":
        source = frame["high"] if "high" in frame else close
        extreme = forward_extreme(source, close, spec.horizon, "high")
        label = (extreme >= spec.threshold).astype(float)
    else:
        source = frame["low"] if "low" in frame else close
        extreme = forward_extreme(source, close, spec.horizon, "low")
        label = (extreme <= -spec.threshold).astype(float)
    return label.where(extreme.notna()).rename(spec.key)


def align_xy(
    features: pd.DataFrame, target: pd.Series
) -> tuple[pd.DataFrame, pd.Series, pd.DatetimeIndex]:
    """Deja solo las filas con variables completas y objetivo conocido."""
    common = features.index.intersection(target.index)
    x = features.loc[common]
    y = target.loc[common]
    mask = x.notna().all(axis=1) & y.notna()
    return x[mask], y[mask].astype(int), common[mask]


def prediction_row(features: pd.DataFrame) -> tuple[pd.Timestamp | None, pd.Series | None]:
    """Última fila con todas las variables completas: el "hoy" del modelo."""
    complete = features.dropna()
    if complete.empty:
        return None, None
    return complete.index[-1], complete.iloc[-1]


def realized_summary(market: MarketData, spec: TargetSpec) -> dict:
    """Estadísticas honestas del objetivo en toda la historia disponible."""
    target = build_target(market, spec).dropna()
    if target.empty:
        return {"observations": 0, "base_rate": None}
    return {
        "observations": int(len(target)),
        "events": int(target.sum()),
        "base_rate": float(target.mean()),
        "first_date": target.index[0].strftime("%Y-%m-%d"),
        "last_date": target.index[-1].strftime("%Y-%m-%d"),
    }
