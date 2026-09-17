"""Backtest con costos, deslizamiento y referencias obligatorias."""

from .engine import BacktestReport, StrategyResult, Trade, run_backtest

__all__ = ["run_backtest", "BacktestReport", "StrategyResult", "Trade"]
