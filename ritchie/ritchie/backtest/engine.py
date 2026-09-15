"""Backtest con supuestos realistas.

Un backtest sin costos es una obra de ficción. Aquí:

* la señal se calcula al **cierre** del día t y la entrada ocurre a la
  **apertura** del día t+1 (nunca al precio que ya se vio),
* cada lado paga comisión y deslizamiento,
* no se abren posiciones encimadas: si ya hay una abierta, la señal se ignora
  (es lo que puede hacer una persona con una sola cuenta),
* se compara contra comprar y mantener, contra operar siempre y contra una
  señal al azar con la misma frecuencia.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..config import BacktestConfig
from ..data.schema import MarketData

TRADING_DAYS = 252


@dataclass
class Trade:
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    gross_return: float
    net_return: float
    probability: float


@dataclass
class StrategyResult:
    name: str
    n_trades: int
    total_return: float
    cagr: float
    sharpe: float | None
    sortino: float | None
    max_drawdown: float
    hit_rate: float | None
    average_trade: float | None
    profit_factor: float | None
    exposure: float
    equity: list[dict] = field(default_factory=list)
    trades: list[Trade] = field(default_factory=list)

    def to_dict(self, with_curve: bool = True) -> dict:
        data = {
            "estrategia": self.name,
            "operaciones": self.n_trades,
            "rendimiento_total": round(self.total_return, 5),
            "rendimiento_anualizado": round(self.cagr, 5),
            "sharpe": round(self.sharpe, 3) if self.sharpe is not None else None,
            "sortino": round(self.sortino, 3) if self.sortino is not None else None,
            "caida_maxima": round(self.max_drawdown, 5),
            "tasa_de_acierto": round(self.hit_rate, 4) if self.hit_rate is not None else None,
            "ganancia_media_por_operacion": (
                round(self.average_trade, 5) if self.average_trade is not None else None
            ),
            "factor_de_ganancia": (
                round(self.profit_factor, 3) if self.profit_factor is not None else None
            ),
            "exposicion": round(self.exposure, 4),
        }
        if with_curve:
            data["curva"] = self.equity
        return data


@dataclass
class BacktestReport:
    strategy: StrategyResult
    benchmarks: list[StrategyResult]
    assumptions: dict
    verdict: str
    beats_benchmarks: bool
    position_sizing: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "estrategia": self.strategy.to_dict(),
            "referencias": [b.to_dict(with_curve=False) for b in self.benchmarks],
            "supuestos": self.assumptions,
            "veredicto": self.verdict,
            "supera_referencias": self.beats_benchmarks,
            "tamanos_de_posicion": self.position_sizing,
        }


def _curve_metrics(equity: pd.Series, exposure_days: int, total_days: int) -> dict:
    if len(equity) < 2:
        return {
            "total": 0.0, "cagr": 0.0, "sharpe": None, "sortino": None,
            "max_dd": 0.0, "exposure": 0.0,
        }
    returns = equity.pct_change().dropna()
    total = float(equity.iloc[-1] / equity.iloc[0] - 1)
    years = max(len(equity) / TRADING_DAYS, 1e-6)
    cagr = float((equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1)
    volatility = float(returns.std(ddof=1))
    sharpe = float(returns.mean() / volatility * np.sqrt(TRADING_DAYS)) if volatility > 1e-12 else None
    downside = returns[returns < 0]
    downside_vol = float(downside.std(ddof=1)) if len(downside) > 1 else 0.0
    sortino = (
        float(returns.mean() / downside_vol * np.sqrt(TRADING_DAYS)) if downside_vol > 1e-12 else None
    )
    drawdown = float((equity / equity.cummax() - 1).min())
    return {
        "total": total,
        "cagr": cagr,
        "sharpe": sharpe,
        "sortino": sortino,
        "max_dd": drawdown,
        "exposure": float(exposure_days / max(total_days, 1)),
    }


def _run_signal_strategy(
    market: MarketData,
    signal: pd.Series,
    horizon: int,
    config: BacktestConfig,
    name: str,
    probabilities: pd.Series | None = None,
) -> StrategyResult:
    """Ejecuta una señal booleana con entradas y salidas realistas."""
    frame = market.frame
    open_price = frame["open"] if "open" in frame else frame["close"]
    close_price = frame["close"]
    dates = frame.index
    positions = {d: i for i, d in enumerate(dates)}

    cost = config.commission + config.slippage
    # Rendimiento diario de la cartera: 0 los días sin posición. La curva sale
    # de un solo producto acumulado al final (nada de rellenar por operación).
    daily_returns = np.zeros(len(dates), dtype=float)
    trades: list[Trade] = []
    exposure_days = 0
    blocked_until = -1

    for date, flag in signal.items():
        if not bool(flag) or date not in positions:
            continue
        i = positions[date]
        if i <= blocked_until:
            continue
        entry_index = i + 1
        exit_index = i + horizon
        if exit_index >= len(dates):
            break
        entry = float(open_price.iloc[entry_index]) * (1 + cost)
        exit_value = float(close_price.iloc[exit_index]) * (1 - cost)
        gross = float(close_price.iloc[exit_index] / open_price.iloc[entry_index] - 1)
        net = exit_value / entry - 1
        trades.append(
            Trade(
                entry_date=dates[entry_index].strftime("%Y-%m-%d"),
                exit_date=dates[exit_index].strftime("%Y-%m-%d"),
                entry_price=round(entry, 4),
                exit_price=round(exit_value, 4),
                gross_return=round(gross, 5),
                net_return=round(net, 5),
                probability=round(float(probabilities.get(date, np.nan)), 4)
                if probabilities is not None
                else float("nan"),
            )
        )
        # La ganancia se reparte entre las sesiones que duró la operación para
        # que la curva refleje cuándo se corrió el riesgo.
        span = exit_index - entry_index + 1
        daily_returns[entry_index : exit_index + 1] = (1 + net) ** (1 / max(span, 1)) - 1
        exposure_days += span
        blocked_until = exit_index

    equity = pd.Series(np.cumprod(1.0 + daily_returns), index=dates)
    metrics = _curve_metrics(equity, exposure_days, len(dates))

    net_returns = [t.net_return for t in trades]
    wins = [r for r in net_returns if r > 0]
    losses = [r for r in net_returns if r <= 0]
    return StrategyResult(
        name=name,
        n_trades=len(trades),
        total_return=metrics["total"],
        cagr=metrics["cagr"],
        sharpe=metrics["sharpe"],
        sortino=metrics["sortino"],
        max_drawdown=metrics["max_dd"],
        hit_rate=float(len(wins) / len(net_returns)) if net_returns else None,
        average_trade=float(np.mean(net_returns)) if net_returns else None,
        profit_factor=(
            float(sum(wins) / abs(sum(losses))) if losses and abs(sum(losses)) > 1e-12 else None
        ),
        exposure=metrics["exposure"],
        equity=[
            {"fecha": d.strftime("%Y-%m-%d"), "valor": round(float(v), 5)}
            for d, v in equity.resample("W").last().dropna().items()
        ],
        trades=trades[-40:],
    )


def _buy_and_hold(market: MarketData, window: pd.DatetimeIndex, config: BacktestConfig) -> StrategyResult:
    close = market.frame["close"].loc[window]
    cost = config.commission + config.slippage
    equity = close / close.iloc[0] * (1 - cost)
    equity.iloc[0] = 1.0
    metrics = _curve_metrics(equity, len(window), len(window))
    return StrategyResult(
        name="comprar_y_mantener",
        n_trades=1,
        total_return=metrics["total"],
        cagr=metrics["cagr"],
        sharpe=metrics["sharpe"],
        sortino=metrics["sortino"],
        max_drawdown=metrics["max_dd"],
        hit_rate=None,
        average_trade=metrics["total"],
        profit_factor=None,
        exposure=1.0,
        equity=[
            {"fecha": d.strftime("%Y-%m-%d"), "valor": round(float(v), 5)}
            for d, v in equity.resample("W").last().dropna().items()
        ],
    )


def run_backtest(
    market: MarketData,
    probabilities: pd.Series,
    horizon: int,
    config: BacktestConfig,
    seed: int = 0,
    threshold: float | None = None,
) -> BacktestReport:
    """Compara la estrategia del modelo contra las referencias obligadas."""
    probabilities = probabilities.dropna()
    if probabilities.empty:
        raise ValueError("No hay probabilidades para backtestear.")
    window = market.frame.index.intersection(probabilities.index)
    probabilities = probabilities.loc[window]

    entry = threshold if threshold is not None else config.entry_probability
    # Si el modelo nunca llega al umbral fijo, se usa su propio percentil 80:
    # la pregunta es si aporta orden, no si supera un número arbitrario.
    if float((probabilities >= entry).sum()) < 10:
        entry = float(probabilities.quantile(0.80))
    signal = probabilities >= entry

    strategy = _run_signal_strategy(
        market, signal, horizon, config, "modelo_ritchie", probabilities
    )

    always = pd.Series(True, index=probabilities.index)
    naive = _run_signal_strategy(market, always, horizon, config, "operar_siempre")

    rng = np.random.default_rng(seed)
    frequency = float(signal.mean())
    random_signal = pd.Series(
        rng.random(len(probabilities)) < max(frequency, 0.02), index=probabilities.index
    )
    random_strategy = _run_signal_strategy(market, random_signal, horizon, config, "señal_al_azar")

    hold = _buy_and_hold(market, window, config)
    benchmarks = [hold, naive, random_strategy]

    beats = all(
        strategy.total_return > benchmark.total_return for benchmark in benchmarks
    ) and (strategy.sharpe or -99) > max(
        (b.sharpe if b.sharpe is not None else -99) for b in benchmarks
    )

    if strategy.n_trades < 20:
        verdict = (
            f"Solo {strategy.n_trades} operaciones: muy pocas para concluir nada. "
            "No se puede afirmar que la estrategia sirva."
        )
    elif beats:
        verdict = (
            "La estrategia supera a comprar y mantener, a operar siempre y al azar, "
            "después de costos. Es una señal a favor, no una garantía."
        )
    else:
        verdict = (
            "La estrategia NO supera de forma clara a sus referencias después de costos. "
            "Usarla no está justificado con esta evidencia."
        )

    sizing = {}
    for fraction in (0.25, 0.50, 1.00):
        if strategy.average_trade is None:
            continue
        sizing[f"{int(fraction * 100)}%_del_capital"] = {
            "rendimiento_total_aprox": round(float(strategy.total_return * fraction), 5),
            "caida_maxima_aprox": round(float(strategy.max_drawdown * fraction), 5),
        }

    return BacktestReport(
        strategy=strategy,
        benchmarks=benchmarks,
        assumptions={
            "comision_por_lado": config.commission,
            "deslizamiento_por_lado": config.slippage,
            "umbral_de_entrada": round(float(entry), 4),
            "entrada": "apertura de la sesión siguiente a la señal",
            "salida": f"cierre de la sesión {horizon} después de la entrada",
            "posiciones_simultaneas": 1,
            "periodo": [
                window[0].strftime("%Y-%m-%d"),
                window[-1].strftime("%Y-%m-%d"),
            ],
        },
        verdict=verdict,
        beats_benchmarks=bool(beats),
        position_sizing=sizing,
    )
