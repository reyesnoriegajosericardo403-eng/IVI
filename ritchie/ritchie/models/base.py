"""Interfaz común de los modelos y utilidades de simulación de caminos."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..data.schema import MarketData
from ..features.targets import TargetSpec

#: Probabilidades siempre acotadas: ni certeza absoluta ni imposibilidad.
PROB_FLOOR = 1e-4
PROB_CEIL = 1 - 1e-4


@dataclass
class SeriesContext:
    """Series crudas que necesitan los modelos estadísticos.

    Los modelos que reciben este contexto solo pueden mirar hasta la fecha que
    están prediciendo. La auditoría automática verifica esa propiedad
    truncando la serie y comprobando que la predicción no cambia.
    """

    market: MarketData
    spec: TargetSpec
    seed: int = 0
    n_paths: int = 800

    @property
    def close(self) -> pd.Series:
        return self.market.frame["close"]

    @property
    def high(self) -> pd.Series:
        return self.market.frame["high"] if "high" in self.market.frame else self.close

    @property
    def low(self) -> pd.Series:
        return self.market.frame["low"] if "low" in self.market.frame else self.close

    @property
    def returns(self) -> pd.Series:
        return self.close.pct_change()

    @property
    def log_returns(self) -> pd.Series:
        return np.log(self.close).diff()

    def rng(self, salt: int = 0) -> np.random.Generator:
        return np.random.default_rng(self.seed + salt)


@dataclass
class Contribution:
    """Aporte de una variable a la probabilidad, con su magnitud real."""

    feature: str
    value: float
    effect: float
    direction: str  # "sube" | "baja"
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "feature": self.feature,
            "value": float(self.value),
            "effect": float(self.effect),
            "direction": self.direction,
            "description": self.description,
        }


class ProbabilisticModel(ABC):
    """Todo modelo de RITCHIE entrega una probabilidad, no un veredicto."""

    name: str = "modelo"
    family: str = "otros"
    purpose: str = ""
    needs_features: bool = True
    is_baseline: bool = False

    def __init__(self) -> None:
        self.fitted: bool = False
        self.train_end: pd.Timestamp | None = None
        self.base_rate: float = 0.5
        self.diagnostics: dict = {}
        #: Durante la validación se apaga: las explicaciones solo hacen falta
        #: en el ajuste final, y calcularlas 60 veces sería tiempo tirado.
        self.compute_explanations: bool = True

    @abstractmethod
    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "ProbabilisticModel":
        """Ajusta con datos que terminan en `x.index[-1]` y ni un día más."""

    @abstractmethod
    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        """Probabilidad del evento para cada fila (fecha) de `x`."""

    def explain(self, x_row: pd.Series, ctx: SeriesContext) -> list[Contribution]:
        """Aportes por variable. Vacío si el modelo no puede justificarlo."""
        return []

    # ------------------------------------------------------------ utilidades
    @staticmethod
    def _clip(values: np.ndarray | float) -> np.ndarray:
        return np.clip(values, PROB_FLOOR, PROB_CEIL)

    def _record_fit(self, x: pd.DataFrame, y: pd.Series) -> None:
        self.fitted = True
        self.train_end = x.index[-1] if len(x) else None
        self.base_rate = float(y.mean()) if len(y) else 0.5

    def info(self) -> dict:
        return {
            "name": self.name,
            "family": self.family,
            "purpose": self.purpose,
            "is_baseline": self.is_baseline,
            "diagnostics": dict(self.diagnostics),
        }


# ----------------------------------------------------------------- caminos
def event_probability_from_paths(
    path_returns: np.ndarray, spec: TargetSpec
) -> np.ndarray:
    """Probabilidad del evento a partir de caminos simulados.

    `path_returns` tiene forma (n_fechas, n_caminos, horizonte) con
    rendimientos simples por sesión. Se evalúa exactamente la misma definición
    de evento que usa la etiqueta histórica.
    """
    growth = np.cumprod(1.0 + path_returns, axis=2)
    final = growth[:, :, -1] - 1.0

    if spec.direction == "range":
        hit = np.abs(final) <= spec.threshold
    elif spec.mode == "close":
        hit = final >= spec.threshold if spec.direction == "up" else final <= -spec.threshold
    else:
        if spec.direction == "up":
            hit = (growth.max(axis=2) - 1.0) >= spec.threshold
        else:
            hit = (growth.min(axis=2) - 1.0) <= -spec.threshold
    return hit.mean(axis=1)


def simulate_iid_bootstrap(
    history: np.ndarray,
    n_dates: int,
    horizon: int,
    n_paths: int,
    rng: np.random.Generator,
    block: int = 1,
) -> np.ndarray:
    """Remuestreo histórico (por bloques si `block` > 1) para `n_dates` fechas."""
    if history.size == 0:
        return np.zeros((n_dates, n_paths, horizon))
    if block <= 1:
        draws = rng.integers(0, history.size, size=(n_dates, n_paths, horizon))
        return history[draws]

    blocks_needed = int(np.ceil(horizon / block))
    starts = rng.integers(0, max(1, history.size - block), size=(n_dates, n_paths, blocks_needed))
    offsets = np.arange(block)
    indices = (starts[..., None] + offsets) % history.size
    sampled = history[indices].reshape(n_dates, n_paths, blocks_needed * block)
    return sampled[:, :, :horizon]
