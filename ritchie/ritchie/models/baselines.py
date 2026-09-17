"""Modelos de referencia. Si un modelo sofisticado no les gana, no sirve."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .base import ProbabilisticModel, SeriesContext, simulate_iid_bootstrap, event_probability_from_paths


class BaseRateModel(ProbabilisticModel):
    """Climatología: la frecuencia histórica del evento, sin más.

    Es la vara de medir del sistema. Cualquier modelo que no supere esto está
    añadiendo complejidad sin añadir información.
    """

    name = "tasa_base"
    family = "baseline"
    purpose = "La frecuencia con la que el evento ocurrió históricamente."
    needs_features = False
    is_baseline = True

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "BaseRateModel":
        self._record_fit(x, y)
        # Suavizado de Laplace: evita afirmar 0% con muestras chicas.
        self.rate = float((y.sum() + 1.0) / (len(y) + 2.0)) if len(y) else 0.5
        self.diagnostics = {"eventos": int(y.sum()), "observaciones": int(len(y))}
        return self

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        return self._clip(np.full(len(x), self.rate))


class RecentRateModel(ProbabilisticModel):
    """Igual que la tasa base, pero mirando solo el último año.

    Sirve para detectar si el régimen cambió: si este modelo le gana a la
    climatología completa, la historia lejana está estorbando.
    """

    name = "tasa_reciente"
    family = "baseline"
    purpose = "La frecuencia del evento en las últimas 252 sesiones."
    needs_features = False
    is_baseline = True

    def __init__(self, window: int = 252):
        super().__init__()
        self.window = window
        self.rate = 0.5

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "RecentRateModel":
        self._record_fit(x, y)
        recent = y.iloc[-self.window :] if len(y) > self.window else y
        self.rate = float((recent.sum() + 1.0) / (len(recent) + 2.0)) if len(recent) else 0.5
        self.diagnostics = {"ventana": int(min(self.window, len(y)))}
        return self

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        return self._clip(np.full(len(x), self.rate))


class RandomModel(ProbabilisticModel):
    """Azar puro, reproducible. Solo existe para comparar."""

    name = "azar"
    family = "baseline"
    purpose = "Probabilidad aleatoria: el piso absoluto de comparación."
    needs_features = False
    is_baseline = True

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "RandomModel":
        self._record_fit(x, y)
        return self

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        rng = np.random.default_rng(ctx.seed + 77)
        return self._clip(rng.uniform(0.02, 0.98, size=len(x)))


class EmpiricalBootstrapModel(ProbabilisticModel):
    """Remuestreo por bloques de los rendimientos históricos del activo.

    No usa ninguna variable explicativa: solo dice "así se ha comportado este
    activo". Es el puente entre la climatología y el motor de escenarios, y
    respeta el agrupamiento de volatilidad gracias al muestreo por bloques.
    """

    name = "bootstrap_historico"
    family = "baseline"
    purpose = "Remuestrea la historia del activo para estimar la probabilidad."
    needs_features = False
    is_baseline = True

    def __init__(self, block: int = 5, lookback: int = 756):
        super().__init__()
        self.block = block
        self.lookback = lookback

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "EmpiricalBootstrapModel":
        self._record_fit(x, y)
        self.diagnostics = {"bloque": self.block, "ventana": self.lookback}
        return self

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        returns = ctx.returns
        spec = ctx.spec
        rng = ctx.rng(11)
        out = np.empty(len(x))
        # Se agrupan fechas para no rehacer la simulación fila por fila: el
        # historial disponible solo cambia al avanzar la fecha.
        for i, date in enumerate(x.index):
            history = returns.loc[:date].dropna().to_numpy()[-self.lookback :]
            if history.size < 60:
                out[i] = self.base_rate
                continue
            paths = simulate_iid_bootstrap(
                history, 1, spec.horizon, min(ctx.n_paths, 2000), rng, block=self.block
            )
            out[i] = event_probability_from_paths(paths, spec)[0]
        return self._clip(out)
