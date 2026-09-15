"""Actualización bayesiana a partir de días históricamente parecidos.

Es el modelo más cercano a cómo razona una persona: "¿qué pasó las otras
veces que este activo estuvo como está hoy?". La diferencia es que aquí la
respuesta no se cuenta a ojo: se parte de la tasa base como creencia previa
(Beta) y se actualiza con la evidencia de los vecinos históricos más
parecidos. Con pocos vecinos la respuesta se queda pegada a la tasa base —que
es exactamente lo correcto cuando hay poca evidencia.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .base import Contribution, ProbabilisticModel, SeriesContext

#: Variables que definen "parecerse". Pocas y con significado, para que la
#: distancia no se diluya en 60 dimensiones.
SIMILARITY_FEATURES = (
    "shock_zscore",
    "vol_percentile_252",
    "ret_5d",
    "rsi_14",
    "dist_high_60",
    "rel_volume_20",
    "drawdown_252",
    "consecutive_down",
)


class BayesianAnalogModel(ProbabilisticModel):
    name = "bayesiano_analogos"
    family = "estadistico"
    purpose = "Parte de la tasa base y la actualiza con los días históricos más parecidos a hoy."

    def __init__(self, n_neighbors: int = 80, prior_strength: float = 25.0):
        super().__init__()
        self.n_neighbors = n_neighbors
        self.prior_strength = prior_strength
        self.columns: list[str] = []
        self.train_x: np.ndarray | None = None
        self.train_y: np.ndarray | None = None
        self.train_dates: pd.DatetimeIndex | None = None
        self.center: np.ndarray | None = None
        self.scale: np.ndarray | None = None

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "BayesianAnalogModel":
        self._record_fit(x, y)
        available = [c for c in SIMILARITY_FEATURES if c in x.columns]
        if len(available) < 3 or len(x) < 120:
            self.train_x = None
            self.diagnostics = {"estado": "variables o muestra insuficientes"}
            return self
        self.columns = available
        values = x[available].to_numpy(dtype=float)
        self.center = np.median(values, axis=0)
        spread = np.percentile(values, 75, axis=0) - np.percentile(values, 25, axis=0)
        self.scale = np.where(spread > 1e-9, spread, np.std(values, axis=0) + 1e-9)
        self.train_x = (values - self.center) / self.scale
        self.train_y = y.to_numpy(dtype=float)
        self.train_dates = x.index
        self.diagnostics = {
            "estado": "ajustado",
            "variables_similitud": available,
            "vecinos": self.n_neighbors,
            "fuerza_previa": self.prior_strength,
            "tasa_base_previa": round(self.base_rate, 4),
        }
        return self

    def _neighbors(self, row: np.ndarray, before: pd.Timestamp | None = None):
        assert self.train_x is not None and self.train_y is not None
        train_x, train_y = self.train_x, self.train_y
        if before is not None and self.train_dates is not None:
            mask = self.train_dates < before
            if mask.sum() >= 60:
                train_x, train_y = train_x[mask], train_y[mask]
        distances = np.sqrt(((train_x - row) ** 2).mean(axis=1))
        k = min(self.n_neighbors, len(distances))
        nearest = np.argpartition(distances, k - 1)[:k]
        return nearest, distances[nearest], train_y[nearest]

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        if self.train_x is None:
            return self._clip(np.full(len(x), self.base_rate))
        rows = (x[self.columns].to_numpy(dtype=float) - self.center) / self.scale
        alpha_prior = self.prior_strength * self.base_rate
        beta_prior = self.prior_strength * (1.0 - self.base_rate)
        out = np.empty(len(x))
        for i in range(len(x)):
            _, distances, outcomes = self._neighbors(rows[i], x.index[i])
            # Los vecinos pesan según qué tan parecidos son (kernel suave).
            bandwidth = max(np.median(distances), 1e-6)
            weights = np.exp(-0.5 * (distances / bandwidth) ** 2)
            hits = float((weights * outcomes).sum())
            total = float(weights.sum())
            out[i] = (alpha_prior + hits) / (alpha_prior + beta_prior + total)
        return self._clip(out)

    def analog_evidence(self, x_row: pd.Series, ctx: SeriesContext) -> dict:
        """Resumen de los días parecidos, para contarlo en lenguaje llano."""
        if self.train_x is None or self.train_dates is None:
            return {}
        row = (x_row[self.columns].to_numpy(dtype=float) - self.center) / self.scale
        nearest, distances, outcomes = self._neighbors(row)
        posterior = self.predict_proba(x_row.to_frame().T, ctx)[0]
        return {
            "vecinos": int(len(outcomes)),
            "aciertos": int(outcomes.sum()),
            "frecuencia_cruda": float(outcomes.mean()) if len(outcomes) else None,
            "tasa_base": float(self.base_rate),
            "probabilidad_posterior": float(posterior),
            "distancia_mediana": float(np.median(distances)),
            "variables_similitud": list(self.columns),
            "fechas_ejemplo": [
                self.train_dates[i].strftime("%Y-%m-%d")
                for i in nearest[np.argsort(distances)][:5]
            ],
        }

    def explain(self, x_row: pd.Series, ctx: SeriesContext) -> list[Contribution]:
        evidence = self.analog_evidence(x_row, ctx)
        if not evidence:
            return []
        effect = evidence["probabilidad_posterior"] - evidence["tasa_base"]
        return [
            Contribution(
                feature="dias_parecidos",
                value=float(evidence["vecinos"]),
                effect=float(effect),
                direction="sube" if effect > 0 else "baja",
                description=(
                    f"En los {evidence['vecinos']} días históricos más parecidos a hoy, "
                    f"el movimiento ocurrió {evidence['aciertos']} veces."
                ),
            )
        ]
