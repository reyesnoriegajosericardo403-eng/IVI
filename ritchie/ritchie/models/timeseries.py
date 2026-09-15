"""Modelos de dependencia temporal: AR (familia ARIMA) y regímenes de Markov."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .base import (
    ProbabilisticModel,
    SeriesContext,
    event_probability_from_paths,
)


class ArBootstrapModel(ProbabilisticModel):
    """AR(p) sobre rendimientos, con residuos remuestreados de la historia.

    Es la pieza "ARIMA" del sistema: captura la dependencia lineal entre el
    rendimiento de hoy y los de los días previos (reversión o continuación).
    En vez de suponer que los errores son normales —los mercados no lo son—,
    se remuestrean los residuos reales del ajuste.
    """

    name = "ar_bootstrap"
    family = "estadistico"
    purpose = "Mide si el movimiento de hoy anticipa el de mañana (reversión o continuación)."
    needs_features = False

    def __init__(self, order: int = 5):
        super().__init__()
        self.order = order
        self.coefficients: np.ndarray | None = None
        self.intercept: float = 0.0
        self.residuals: np.ndarray = np.array([])

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "ArBootstrapModel":
        self._record_fit(x, y)
        history = ctx.log_returns.loc[: x.index[-1]].dropna().to_numpy()
        if history.size < 100 + self.order:
            self.coefficients = None
            self.diagnostics = {"estado": "muestra insuficiente"}
            return self

        lags = np.column_stack(
            [history[self.order - k - 1 : -k - 1] for k in range(self.order)]
        )
        design = np.column_stack([np.ones(len(lags)), lags])
        response = history[self.order :]
        solution, *_ = np.linalg.lstsq(design, response, rcond=None)
        self.intercept = float(solution[0])
        self.coefficients = solution[1:]
        fitted = design @ solution
        self.residuals = response - fitted

        total_variance = float(np.var(response, ddof=1))
        explained = 1.0 - float(np.var(self.residuals, ddof=1)) / max(total_variance, 1e-12)
        self.diagnostics = {
            "estado": "ajustado",
            "orden": self.order,
            "r2": round(explained, 5),
            "coef_lag1": round(float(self.coefficients[0]), 5),
            "residuos": int(self.residuals.size),
        }
        return self

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        if self.coefficients is None or self.residuals.size < 50:
            return self._clip(np.full(len(x), self.base_rate))

        series = ctx.log_returns.dropna()
        horizon = ctx.spec.horizon
        n_paths = min(ctx.n_paths, 1500)
        rng = ctx.rng(202)
        out = np.empty(len(x))

        positions = series.index.get_indexer(x.index)
        values = series.to_numpy()
        for i, position in enumerate(positions):
            if position < self.order:
                out[i] = self.base_rate
                continue
            recent = values[position - self.order + 1 : position + 1][::-1].copy()
            state = np.repeat(recent[None, :], n_paths, axis=0)
            draws = rng.integers(0, self.residuals.size, size=(n_paths, horizon))
            shocks = self.residuals[draws]
            path = np.empty((n_paths, horizon))
            for step in range(horizon):
                mean = self.intercept + state @ self.coefficients
                value = mean + shocks[:, step]
                path[:, step] = value
                state = np.column_stack([value, state[:, :-1]])
            simple = np.exp(path) - 1.0
            out[i] = event_probability_from_paths(simple[None, :, :], ctx.spec)[0]
        return self._clip(out)


class MarkovRegimeModel(ProbabilisticModel):
    """Dos regímenes ocultos (calma y estrés) estimados con EM.

    Identifica en qué estado está el mercado *con la información disponible
    hasta hoy* (filtro hacia adelante, nunca suavizado: el suavizado usaría el
    futuro y sería una fuga de información).
    """

    name = "markov_regimenes"
    family = "estadistico"
    purpose = "Detecta si el activo está en un régimen de calma o de estrés."
    needs_features = False

    def __init__(self, max_iter: int = 80, tol: float = 1e-5):
        super().__init__()
        self.max_iter = max_iter
        self.tol = tol
        self.mu = np.array([0.0, 0.0])
        self.sigma = np.array([0.01, 0.03])
        self.transition = np.array([[0.97, 0.03], [0.05, 0.95]])
        self.initial = np.array([0.5, 0.5])
        self.ready = False

    # ------------------------------------------------------------------ EM
    @staticmethod
    def _gaussian_density(values: np.ndarray, mu: np.ndarray, sigma: np.ndarray) -> np.ndarray:
        z = (values[:, None] - mu[None, :]) / sigma[None, :]
        return np.exp(-0.5 * z**2) / (sigma[None, :] * np.sqrt(2 * np.pi))

    def _forward_backward(self, values: np.ndarray):
        n = values.size
        density = self._gaussian_density(values, self.mu, self.sigma) + 1e-300
        alpha = np.zeros((n, 2))
        scaling = np.zeros(n)
        alpha[0] = self.initial * density[0]
        scaling[0] = alpha[0].sum()
        alpha[0] /= scaling[0]
        for t in range(1, n):
            alpha[t] = (alpha[t - 1] @ self.transition) * density[t]
            scaling[t] = alpha[t].sum()
            alpha[t] /= max(scaling[t], 1e-300)

        beta = np.zeros((n, 2))
        beta[-1] = 1.0
        for t in range(n - 2, -1, -1):
            beta[t] = self.transition @ (density[t + 1] * beta[t + 1])
            beta[t] /= max(beta[t].sum(), 1e-300)

        gamma = alpha * beta
        gamma /= np.clip(gamma.sum(axis=1, keepdims=True), 1e-300, None)

        # xi[t, i, j] = P(estado_t = i, estado_{t+1} = j | toda la serie).
        # Vectorizado: el bucle equivalente en Python domina el tiempo del EM.
        numerator = (
            alpha[:-1, :, None]
            * self.transition[None, :, :]
            * (density[1:] * beta[1:])[:, None, :]
        )
        xi = numerator / np.clip(numerator.sum(axis=(1, 2), keepdims=True), 1e-300, None)
        loglik = float(np.sum(np.log(np.clip(scaling, 1e-300, None))))
        return gamma, xi, loglik

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "MarkovRegimeModel":
        self._record_fit(x, y)
        history = ctx.log_returns.loc[: x.index[-1]].dropna().to_numpy()
        if history.size < 250:
            self.ready = False
            self.diagnostics = {"estado": "muestra insuficiente"}
            return self

        std = float(np.std(history, ddof=1))
        mean = float(np.mean(history))
        self.mu = np.array([mean, mean])
        self.sigma = np.array([std * 0.6, std * 1.8])
        self.transition = np.array([[0.97, 0.03], [0.06, 0.94]])
        self.initial = np.array([0.5, 0.5])

        previous = -np.inf
        for _ in range(self.max_iter):
            gamma, xi, loglik = self._forward_backward(history)
            weights = gamma.sum(axis=0)
            self.mu = (gamma * history[:, None]).sum(axis=0) / np.clip(weights, 1e-12, None)
            variance = (gamma * (history[:, None] - self.mu[None, :]) ** 2).sum(axis=0) / np.clip(
                weights, 1e-12, None
            )
            self.sigma = np.sqrt(np.clip(variance, 1e-12, None))
            self.transition = xi.sum(axis=0) / np.clip(
                xi.sum(axis=(0, 2))[:, None], 1e-12, None
            )
            self.initial = gamma[0]
            if abs(loglik - previous) < self.tol * max(1.0, abs(previous)):
                break
            previous = loglik

        order = np.argsort(self.sigma)  # 0 = calma, 1 = estrés
        self.mu = self.mu[order]
        self.sigma = self.sigma[order]
        self.transition = self.transition[np.ix_(order, order)]
        self.initial = self.initial[order]
        self.ready = True
        self.diagnostics = {
            "estado": "ajustado",
            "vol_anual_calma": round(float(self.sigma[0] * np.sqrt(252)), 4),
            "vol_anual_estres": round(float(self.sigma[1] * np.sqrt(252)), 4),
            "persistencia_calma": round(float(self.transition[0, 0]), 4),
            "persistencia_estres": round(float(self.transition[1, 1]), 4),
        }
        return self

    # ----------------------------------------------------------- filtro
    def filtered_states(self, ctx: SeriesContext, dates: pd.DatetimeIndex) -> np.ndarray:
        """P(estado | información hasta t). Solo pasada hacia adelante."""
        series = ctx.log_returns.dropna()
        values = series.to_numpy()
        density = self._gaussian_density(values, self.mu, self.sigma) + 1e-300
        n = values.size
        alpha = np.zeros((n, 2))
        alpha[0] = self.initial * density[0]
        alpha[0] /= max(alpha[0].sum(), 1e-300)
        for t in range(1, n):
            alpha[t] = (alpha[t - 1] @ self.transition) * density[t]
            alpha[t] /= max(alpha[t].sum(), 1e-300)
        frame = pd.DataFrame(alpha, index=series.index, columns=["calma", "estres"])
        return frame.reindex(dates).to_numpy()

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        if not self.ready:
            return self._clip(np.full(len(x), self.base_rate))

        states = self.filtered_states(ctx, x.index)
        horizon = ctx.spec.horizon
        n_paths = min(ctx.n_paths, 1200)
        rng = ctx.rng(303)
        out = np.empty(len(x))

        for i in range(len(x)):
            probabilities = states[i]
            if not np.all(np.isfinite(probabilities)):
                out[i] = self.base_rate
                continue
            current = rng.choice(2, size=n_paths, p=probabilities / probabilities.sum())
            path = np.empty((n_paths, horizon))
            for step in range(horizon):
                jump = rng.random(n_paths)
                stay = self.transition[current, current]
                # Transición del estado t al t+1 antes de generar el rendimiento.
                switched = jump > stay
                current = np.where(switched, 1 - current, current)
                path[:, step] = self.mu[current] + self.sigma[current] * rng.standard_normal(n_paths)
            simple = np.exp(path) - 1.0
            out[i] = event_probability_from_paths(simple[None, :, :], ctx.spec)[0]
        return self._clip(out)

    def current_regime(self, ctx: SeriesContext, date: pd.Timestamp) -> dict:
        """Estado del mercado hoy, para la explicación en lenguaje simple."""
        if not self.ready:
            return {}
        probabilities = self.filtered_states(ctx, pd.DatetimeIndex([date]))[0]
        if not np.all(np.isfinite(probabilities)):
            return {}
        label = "calma" if probabilities[0] >= probabilities[1] else "estrés"
        return {
            "regimen": label,
            "p_calma": float(probabilities[0]),
            "p_estres": float(probabilities[1]),
            "vol_anual_calma": float(self.sigma[0] * np.sqrt(252)),
            "vol_anual_estres": float(self.sigma[1] * np.sqrt(252)),
        }
