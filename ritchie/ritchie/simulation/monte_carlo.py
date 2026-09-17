"""Motor de escenarios Monte Carlo.

Su papel NO es predecir. Es responder "¿qué rango de cosas puede pasar y con
qué frecuencia?". Genera miles de futuros posibles con tres mecanismos
distintos y los junta, para que la forma de la distribución no dependa de un
único supuesto:

* remuestreo por bloques de la historia real del activo (sin suponer nada),
* GARCH con colas pesadas (respeta el nivel de volatilidad de hoy),
* cambio de régimen (permite que el mercado cambie de humor a medio camino).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..data.schema import MarketData
from ..features.targets import TargetSpec
from ..models.base import SeriesContext, simulate_iid_bootstrap
from ..models.garch import GarchModel
from ..models.timeseries import MarkovRegimeModel

PERCENTILES = (1, 5, 10, 25, 50, 75, 90, 95, 99)


@dataclass
class ScenarioReport:
    """Distribución de futuros posibles, en precios y en porcentajes."""

    symbol: str
    last_price: float
    horizon: int
    n_paths: int
    engines: list[str]
    percentiles_return: dict[str, float]
    percentiles_price: dict[str, float]
    probability_up: float
    probability_down: float
    probability_target: float | None
    expected_return: float
    median_return: float
    cone: list[dict] = field(default_factory=list)
    cases: dict = field(default_factory=dict)
    risk: dict = field(default_factory=dict)
    engine_agreement: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "simbolo": self.symbol,
            "precio_actual": round(self.last_price, 6),
            "horizonte": self.horizon,
            "caminos": self.n_paths,
            "motores": self.engines,
            "percentiles_rendimiento": {k: round(v, 6) for k, v in self.percentiles_return.items()},
            "percentiles_precio": {k: round(v, 4) for k, v in self.percentiles_price.items()},
            "probabilidad_sube": round(self.probability_up, 4),
            "probabilidad_baja": round(self.probability_down, 4),
            "probabilidad_objetivo": (
                round(self.probability_target, 4) if self.probability_target is not None else None
            ),
            "rendimiento_esperado": round(self.expected_return, 6),
            "rendimiento_mediano": round(self.median_return, 6),
            "cono": self.cone,
            "escenarios": self.cases,
            "riesgo": self.risk,
            "acuerdo_entre_motores": self.engine_agreement,
        }


def _bootstrap_paths(
    ctx: SeriesContext, n_paths: int, horizon: int, lookback: int, block: int
) -> np.ndarray:
    history = ctx.returns.dropna().to_numpy()[-lookback:]
    if history.size < 60:
        return np.zeros((0, horizon))
    paths = simulate_iid_bootstrap(history, 1, horizon, n_paths, ctx.rng(901), block=block)
    return paths[0]


def _garch_paths(ctx: SeriesContext, model: GarchModel, n_paths: int, date: pd.Timestamp) -> np.ndarray:
    if not model.params:
        return np.zeros((0, ctx.spec.horizon))
    paths = model.simulate(ctx, pd.DatetimeIndex([date]), n_paths=n_paths)
    return paths[0]


def _regime_paths(
    ctx: SeriesContext, model: MarkovRegimeModel, n_paths: int, date: pd.Timestamp
) -> np.ndarray:
    if not model.ready:
        return np.zeros((0, ctx.spec.horizon))
    states = model.filtered_states(ctx, pd.DatetimeIndex([date]))[0]
    if not np.all(np.isfinite(states)):
        return np.zeros((0, ctx.spec.horizon))
    rng = ctx.rng(903)
    horizon = ctx.spec.horizon
    current = rng.choice(2, size=n_paths, p=states / states.sum())
    log_paths = np.empty((n_paths, horizon))
    for step in range(horizon):
        stay = model.transition[current, current]
        switched = rng.random(n_paths) > stay
        current = np.where(switched, 1 - current, current)
        log_paths[:, step] = model.mu[current] + model.sigma[current] * rng.standard_normal(n_paths)
    return np.exp(log_paths) - 1.0


def run_scenarios(
    market: MarketData,
    spec: TargetSpec,
    ctx: SeriesContext,
    n_paths: int = 20000,
    garch: GarchModel | None = None,
    regime: MarkovRegimeModel | None = None,
    block: int = 5,
    lookback: int = 1260,
) -> ScenarioReport:
    """Genera la distribución de escenarios para el horizonte pedido."""
    horizon = spec.horizon
    date = market.frame.index[-1]
    per_engine = max(2000, n_paths // 3)

    engines: dict[str, np.ndarray] = {}
    bootstrap = _bootstrap_paths(ctx, per_engine, horizon, lookback, block)
    if bootstrap.size:
        engines["bootstrap_por_bloques"] = bootstrap
    if garch is not None:
        garch_paths = _garch_paths(ctx, garch, per_engine, date)
        if garch_paths.size:
            engines["garch_t"] = garch_paths
    if regime is not None:
        regime_paths = _regime_paths(ctx, regime, per_engine, date)
        if regime_paths.size:
            engines["cambio_de_regimen"] = regime_paths

    if not engines:
        raise ValueError("No hay suficiente historia para simular escenarios.")

    all_paths = np.vstack(list(engines.values()))
    growth = np.cumprod(1.0 + all_paths, axis=1)
    final = growth[:, -1] - 1.0
    last_price = market.last_price

    percentiles_return = {
        f"p{p}": float(np.percentile(final, p)) for p in PERCENTILES
    }
    percentiles_price = {
        key: float(last_price * (1 + value)) for key, value in percentiles_return.items()
    }

    cone = []
    for step in range(horizon):
        step_values = growth[:, step] - 1.0
        cone.append(
            {
                "sesion": step + 1,
                "p10": round(float(last_price * (1 + np.percentile(step_values, 10))), 4),
                "p25": round(float(last_price * (1 + np.percentile(step_values, 25))), 4),
                "p50": round(float(last_price * (1 + np.percentile(step_values, 50))), 4),
                "p75": round(float(last_price * (1 + np.percentile(step_values, 75))), 4),
                "p90": round(float(last_price * (1 + np.percentile(step_values, 90))), 4),
            }
        )

    # Escenarios nombrados: no son adornos, son percentiles concretos.
    cases = {
        "pesimista": {
            "percentil": 10,
            "rendimiento": round(float(percentiles_return["p10"]), 6),
            "precio": round(float(percentiles_price["p10"]), 4),
        },
        "base": {
            "percentil": 50,
            "rendimiento": round(float(percentiles_return["p50"]), 6),
            "precio": round(float(percentiles_price["p50"]), 4),
        },
        "optimista": {
            "percentil": 90,
            "rendimiento": round(float(percentiles_return["p90"]), 6),
            "precio": round(float(percentiles_price["p90"]), 4),
        },
    }

    drawdowns = growth / np.maximum.accumulate(growth, axis=1) - 1.0
    worst_drawdown = drawdowns.min(axis=1)
    risk = {
        "var_95": round(float(np.percentile(final, 5)), 6),
        "cvar_95": round(float(final[final <= np.percentile(final, 5)].mean()), 6),
        "caida_maxima_mediana": round(float(np.median(worst_drawdown)), 6),
        "caida_maxima_p90": round(float(np.percentile(worst_drawdown, 10)), 6),
        "probabilidad_perdida_5pct": round(float((final <= -0.05).mean()), 4),
        "probabilidad_perdida_10pct": round(float((final <= -0.10).mean()), 4),
    }

    probability_target = None
    if spec.direction != "range":
        from ..models.base import event_probability_from_paths

        probability_target = float(event_probability_from_paths(all_paths[None, :, :], spec)[0])

    agreement = {}
    for name, paths in engines.items():
        engine_final = np.cumprod(1.0 + paths, axis=1)[:, -1] - 1.0
        agreement[name] = {
            "caminos": int(len(paths)),
            "mediana": round(float(np.median(engine_final)), 6),
            "p10": round(float(np.percentile(engine_final, 10)), 6),
            "p90": round(float(np.percentile(engine_final, 90)), 6),
            "prob_sube": round(float((engine_final > 0).mean()), 4),
        }

    return ScenarioReport(
        symbol=market.symbol,
        last_price=last_price,
        horizon=horizon,
        n_paths=int(len(all_paths)),
        engines=list(engines),
        percentiles_return=percentiles_return,
        percentiles_price=percentiles_price,
        probability_up=float((final > 0).mean()),
        probability_down=float((final < 0).mean()),
        probability_target=probability_target,
        expected_return=float(final.mean()),
        median_return=float(np.median(final)),
        cone=cone,
        cases=cases,
        risk=risk,
        engine_agreement=agreement,
    )
