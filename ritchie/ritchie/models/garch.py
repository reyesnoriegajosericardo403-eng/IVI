"""GARCH(1,1) con innovaciones t de Student.

Modela lo único que en los mercados es realmente predecible: la volatilidad
se agrupa. Después de un día violento viene otro día violento. Con la
volatilidad condicional estimada, la probabilidad del objetivo sale de simular
caminos hacia adelante con la misma definición de evento que usa la etiqueta.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.signal import lfilter
from scipy.special import gammaln

from .base import (
    ProbabilisticModel,
    SeriesContext,
    event_probability_from_paths,
)

MIN_NU = 2.5
MAX_NU = 40.0


def _recursion(driver: np.ndarray, beta: float, initial: float) -> np.ndarray:
    """Resuelve h[i] = driver[i] + beta·h[i-1] como filtro IIR.

    Es exactamente la recursión GARCH, pero calculada en C en vez de en un
    bucle de Python: el ajuste por máxima verosimilitud la evalúa miles de
    veces y ahí se va todo el tiempo de cómputo.
    """
    work = driver.copy()
    work[0] = initial
    return lfilter([1.0], [1.0, -beta], work)


def _neg_loglikelihood(params: np.ndarray, returns: np.ndarray, target_var: float) -> float:
    """Menos log-verosimilitud con objetivo de varianza (omega implícito)."""
    mu, alpha, beta, nu = params
    if alpha < 0 or beta < 0 or alpha + beta > 0.9995 or nu <= MIN_NU or nu > MAX_NU:
        return 1e10
    omega = target_var * (1.0 - alpha - beta)
    if omega <= 0:
        return 1e10

    errors = returns - mu
    driver = np.empty(errors.size)
    driver[1:] = omega + alpha * errors[:-1] ** 2
    variance = _recursion(driver, beta, target_var)
    if not np.all(np.isfinite(variance)) or np.any(variance <= 0):
        return 1e10

    scale = np.sqrt(variance * (nu - 2.0) / nu)
    z = errors / scale
    constant = gammaln((nu + 1) / 2) - gammaln(nu / 2) - 0.5 * np.log(np.pi * nu)
    loglik = np.sum(constant - np.log(scale) - (nu + 1) / 2 * np.log1p(z**2 / nu))
    return float(-loglik) if np.isfinite(loglik) else 1e10


def _filter_variance(
    returns: np.ndarray, mu: float, omega: float, alpha: float, beta: float, init: float
) -> np.ndarray:
    """Varianza condicional h_t usando solo información hasta t-1.

    Devuelve n+1 valores: el elemento i+1 es la varianza del día i+1 que ya se
    conoce al cierre del día i. Esa es la pieza que hace que el modelo no mire
    al futuro.
    """
    errors = returns - mu
    driver = np.empty(returns.size + 1)
    driver[1:] = omega + alpha * errors**2
    return _recursion(driver, beta, init)


class GarchModel(ProbabilisticModel):
    name = "garch"
    family = "estadistico"
    purpose = "Estima la volatilidad actual y de ahí la probabilidad del movimiento."
    needs_features = False

    def __init__(self) -> None:
        super().__init__()
        self.params: dict[str, float] = {}

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "GarchModel":
        self._record_fit(x, y)
        history = ctx.log_returns.loc[: x.index[-1]].dropna().to_numpy()
        if history.size < 250:
            self.params = {}
            self.diagnostics = {"estado": "muestra insuficiente para ajustar GARCH"}
            return self

        target_var = float(np.var(history, ddof=1))
        best = None
        for start in ((history.mean(), 0.08, 0.88, 6.0), (history.mean(), 0.15, 0.75, 4.0)):
            try:
                result = minimize(
                    _neg_loglikelihood,
                    np.array(start, dtype=float),
                    args=(history, target_var),
                    method="L-BFGS-B",
                    bounds=[(-0.2, 0.2), (1e-4, 0.5), (0.0, 0.999), (MIN_NU + 0.1, MAX_NU)],
                    options={"maxiter": 250},
                )
                if result.success or np.isfinite(result.fun):
                    if best is None or result.fun < best.fun:
                        best = result
            except Exception:  # noqa: BLE001 - se cae al plan B más abajo
                continue

        if best is None:
            # Plan B honesto: volatilidad constante con colas empíricas.
            self.params = {
                "mu": float(history.mean()),
                "omega": target_var,
                "alpha": 0.0,
                "beta": 0.0,
                "nu": 5.0,
                "target_var": target_var,
            }
            self.diagnostics = {"estado": "no convergió; se usó volatilidad constante"}
            return self

        mu, alpha, beta, nu = best.x
        omega = target_var * (1.0 - alpha - beta)
        self.params = {
            "mu": float(mu),
            "omega": float(omega),
            "alpha": float(alpha),
            "beta": float(beta),
            "nu": float(nu),
            "target_var": target_var,
        }
        persistence = alpha + beta
        self.diagnostics = {
            "estado": "ajustado",
            "alpha": round(float(alpha), 4),
            "beta": round(float(beta), 4),
            "persistencia": round(float(persistence), 4),
            "grados_libertad_t": round(float(nu), 2),
            "vol_larga_anual": round(float(np.sqrt(target_var * 252)), 4),
            "vida_media_shock_dias": (
                round(float(np.log(0.5) / np.log(persistence)), 1) if 0 < persistence < 1 else None
            ),
        }
        return self

    # ------------------------------------------------------------ predicción
    def conditional_sigma(self, ctx: SeriesContext, dates: pd.DatetimeIndex) -> np.ndarray:
        """σ del día siguiente para cada fecha, con datos hasta esa fecha."""
        if not self.params:
            return np.full(len(dates), np.nan)
        series = ctx.log_returns.dropna()
        values = series.to_numpy()
        p = self.params
        variance = _filter_variance(
            values, p["mu"], p["omega"], p["alpha"], p["beta"], p["target_var"]
        )
        # variance[i+1] es la varianza del día i+1 conocida al cierre del día i.
        lookup = pd.Series(variance[1:], index=series.index)
        aligned = lookup.reindex(dates).to_numpy()
        return np.sqrt(aligned)

    def simulate(
        self, ctx: SeriesContext, dates: pd.DatetimeIndex, n_paths: int | None = None
    ) -> np.ndarray:
        """Caminos de rendimientos simples, forma (n_fechas, n_caminos, H)."""
        p = self.params
        horizon = ctx.spec.horizon
        n_paths = n_paths or ctx.n_paths
        sigma_next = self.conditional_sigma(ctx, dates)
        variance = np.where(np.isfinite(sigma_next), sigma_next**2, p.get("target_var", 1e-4))
        variance = np.repeat(variance[:, None], n_paths, axis=1)

        rng = ctx.rng(101)
        nu = p.get("nu", 5.0)
        mu, omega, alpha, beta = p["mu"], p["omega"], p["alpha"], p["beta"]
        scale_factor = np.sqrt((nu - 2.0) / nu)

        log_paths = np.empty((len(dates), n_paths, horizon))
        for step in range(horizon):
            z = rng.standard_t(df=nu, size=variance.shape) * scale_factor
            error = np.sqrt(variance) * z
            log_paths[:, :, step] = mu + error
            variance = omega + alpha * error**2 + beta * variance
        return np.exp(log_paths) - 1.0

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        if not self.params:
            return self._clip(np.full(len(x), self.base_rate))
        paths = self.simulate(ctx, x.index)
        return self._clip(event_probability_from_paths(paths, ctx.spec))
