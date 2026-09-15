"""Construcción de la matriz de variables.

Regla única e innegociable: la fila con fecha t contiene solo información
disponible al cierre de t. El objetivo vive en t+1..t+H y se construye aparte
(`targets.py`). Cualquier variable que rompa esto es una fuga de información y
la auditoría automática la detecta.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..data.loader import align_companion
from ..data.schema import MarketData
from . import indicators as ind


@dataclass
class FeatureMatrix:
    """Variables, más la explicación de qué es cada una."""

    frame: pd.DataFrame
    descriptions: dict[str, str] = field(default_factory=dict)
    families: dict[str, str] = field(default_factory=dict)
    skipped: dict[str, str] = field(default_factory=dict)

    @property
    def columns(self) -> list[str]:
        return list(self.frame.columns)

    def family_of(self, name: str) -> str:
        return self.families.get(name, "otros")

    def describe(self, name: str) -> str:
        return self.descriptions.get(name, name)


class FeatureBuilder:
    """Genera todas las familias de variables del spec."""

    def __init__(self) -> None:
        self.descriptions: dict[str, str] = {}
        self.families: dict[str, str] = {}
        self.skipped: dict[str, str] = {}

    def _add(
        self,
        store: dict[str, pd.Series],
        name: str,
        series: pd.Series,
        family: str,
        description: str,
    ) -> None:
        store[name] = series.replace([np.inf, -np.inf], np.nan)
        self.families[name] = family
        self.descriptions[name] = description

    # ------------------------------------------------------------------ API
    def build(
        self, market: MarketData, companions: dict[str, MarketData] | None = None
    ) -> FeatureMatrix:
        frame = market.frame
        close = frame["close"]
        open_ = frame["open"] if "open" in frame else close
        high = frame["high"] if "high" in frame else close
        low = frame["low"] if "low" in frame else close
        returns = close.pct_change()

        features: dict[str, pd.Series] = {}
        self._price(features, close, open_, high, low, returns)
        self._technical(features, close, high, low)
        self._volatility(features, returns, high, low)
        self._volume(features, frame)
        self._sequence(features, close, returns)
        self._calendar(features, frame.index)
        self._cross_asset(features, frame, returns, companions or {})

        matrix = pd.DataFrame(features, index=frame.index)
        matrix = matrix.replace([np.inf, -np.inf], np.nan)
        # Columnas constantes o casi vacías no informan y desestabilizan modelos.
        for column in list(matrix.columns):
            valid = matrix[column].dropna()
            if len(valid) < 60:
                self.skipped[column] = "menos de 60 observaciones válidas"
                matrix = matrix.drop(columns=[column])
            elif valid.nunique() <= 1:
                self.skipped[column] = "la variable es constante"
                matrix = matrix.drop(columns=[column])

        return FeatureMatrix(
            frame=matrix,
            descriptions=dict(self.descriptions),
            families=dict(self.families),
            skipped=dict(self.skipped),
        )

    # -------------------------------------------------------------- familias
    def _price(self, store, close, open_, high, low, returns) -> None:
        self._add(store, "ret_1d", returns, "precio", "el movimiento de hoy")
        self._add(
            store,
            "ret_overnight",
            open_ / close.shift(1) - 1.0,
            "precio",
            "el salto entre el cierre de ayer y la apertura de hoy",
        )
        self._add(
            store,
            "ret_intraday",
            close / open_ - 1.0,
            "precio",
            "lo que se movió dentro de la sesión de hoy",
        )
        for window in (2, 3, 5, 10, 20, 60, 120):
            self._add(
                store,
                f"ret_{window}d",
                close / close.shift(window) - 1.0,
                "precio",
                f"lo acumulado en las últimas {window} sesiones",
            )
        self._add(
            store,
            "gap_abs",
            (open_ / close.shift(1) - 1.0).abs(),
            "precio",
            "qué tan grande fue el salto de apertura",
        )
        self._add(
            store,
            "range_pct",
            (high - low) / close.replace(0, np.nan),
            "precio",
            "qué tan amplio fue el rango del día",
        )
        self._add(
            store,
            "close_position_in_range",
            (close - low) / (high - low).replace(0, np.nan),
            "precio",
            "si cerró cerca del máximo o del mínimo del día",
        )
        for window in (20, 60, 252):
            self._add(
                store,
                f"dist_high_{window}",
                close / high.rolling(window, min_periods=window).max() - 1.0,
                "precio",
                f"qué tan lejos está de su máximo de {window} sesiones",
            )
            self._add(
                store,
                f"dist_low_{window}",
                close / low.rolling(window, min_periods=window).min() - 1.0,
                "precio",
                f"qué tan lejos está de su mínimo de {window} sesiones",
            )

    def _technical(self, store, close, high, low) -> None:
        for window in (5, 10, 20, 50, 200):
            self._add(
                store,
                f"sma_ratio_{window}",
                close / ind.sma(close, window) - 1.0,
                "tecnico",
                f"qué tan arriba o abajo está de su promedio de {window} sesiones",
            )
        self._add(
            store,
            "sma_cross_20_50",
            ind.sma(close, 20) / ind.sma(close, 50) - 1.0,
            "tecnico",
            "si la tendencia corta va por encima de la larga",
        )
        for window in (7, 14, 28):
            self._add(
                store,
                f"rsi_{window}",
                ind.rsi(close, window) / 100.0,
                "tecnico",
                f"qué tan sobrecomprado o sobrevendido está (RSI {window})",
            )
        line, signal, histogram = ind.macd(close)
        scale = close.replace(0, np.nan)
        self._add(store, "macd_norm", line / scale, "tecnico", "la fuerza de la tendencia (MACD)")
        self._add(store, "macd_signal_norm", signal / scale, "tecnico", "la señal del MACD")
        self._add(
            store, "macd_hist_norm", histogram / scale, "tecnico", "si el impulso se acelera o se frena"
        )
        self._add(
            store,
            "atr_pct_14",
            ind.atr(high, low, close, 14) / scale,
            "tecnico",
            "cuánto se mueve normalmente en un día (ATR)",
        )
        percent_b, width = ind.bollinger(close, 20, 2.0)
        self._add(store, "bollinger_pct_b", percent_b, "tecnico", "dónde está dentro de su banda normal")
        self._add(store, "bollinger_width", width, "tecnico", "qué tan apretado está el rango reciente")
        for window in (10, 20, 60):
            self._add(
                store,
                f"roc_{window}",
                close.pct_change(window),
                "tecnico",
                f"la velocidad del movimiento de {window} sesiones",
            )

    def _volatility(self, store, returns, high, low) -> None:
        for window in (5, 10, 20, 60):
            self._add(
                store,
                f"vol_{window}",
                ind.realized_volatility(returns, window),
                "volatilidad",
                f"qué tan movido ha estado en {window} sesiones",
            )
        short = ind.realized_volatility(returns, 5)
        long = ind.realized_volatility(returns, 60)
        self._add(
            store,
            "vol_ratio_5_60",
            short / long.replace(0, np.nan),
            "volatilidad",
            "si se está moviendo más de lo habitual",
        )
        self._add(
            store,
            "vol_percentile_252",
            ind.rolling_percentile(ind.realized_volatility(returns, 20), 252),
            "volatilidad",
            "qué tan alta es su volatilidad comparada con su propio año",
        )
        self._add(
            store,
            "parkinson_vol_20",
            ind.parkinson_volatility(high, low, 20),
            "volatilidad",
            "volatilidad medida por el rango diario",
        )
        self._add(
            store,
            "downside_vol_20",
            ind.downside_volatility(returns, 20),
            "volatilidad",
            "qué tan bruscas han sido las bajadas",
        )

    def _volume(self, store, frame) -> None:
        if "volume" not in frame.columns or frame["volume"].notna().sum() < 60:
            self.skipped["volumen"] = "la fuente no entrega volumen utilizable"
            return
        volume = frame["volume"].astype(float)
        average_20 = volume.rolling(20, min_periods=20).mean()
        self._add(
            store,
            "rel_volume_20",
            volume / average_20.replace(0, np.nan),
            "volumen",
            "cuánta gente está operando comparado con lo normal",
        )
        self._add(
            store,
            "volume_change",
            volume.pct_change().clip(-5, 5),
            "volumen",
            "si el volumen subió o bajó respecto de ayer",
        )
        log_volume = np.log(volume.replace(0, np.nan))
        self._add(
            store,
            "volume_zscore_60",
            (log_volume - log_volume.rolling(60, min_periods=60).mean())
            / log_volume.rolling(60, min_periods=60).std(ddof=1).replace(0, np.nan),
            "volumen",
            "qué tan inusual es el volumen de hoy",
        )
        self._add(
            store,
            "dollar_volume_ratio",
            (volume * frame["close"]) / (volume * frame["close"]).rolling(20, min_periods=20).mean(),
            "volumen",
            "cuánto dinero se movió hoy frente a lo normal",
        )

    def _sequence(self, store, close, returns) -> None:
        up, down = ind.consecutive_runs(returns.fillna(0.0))
        self._add(store, "consecutive_up", up, "secuencia", "cuántos días seguidos lleva subiendo")
        self._add(store, "consecutive_down", down, "secuencia", "cuántos días seguidos lleva bajando")
        self._add(
            store,
            "prev_ret_abs",
            returns.abs(),
            "secuencia",
            "qué tan fuerte fue el movimiento más reciente",
        )
        vol_20 = ind.realized_volatility(returns, 20, annualize=False)
        self._add(
            store,
            "shock_zscore",
            returns / vol_20.replace(0, np.nan),
            "secuencia",
            "si el movimiento de hoy fue normal o extremo para este activo",
        )
        self._add(
            store,
            "drawdown_252",
            ind.drawdown_from_peak(close, 252),
            "secuencia",
            "cuánto ha caído desde su mejor momento del último año",
        )
        self._add(
            store,
            "drawdown_20",
            ind.drawdown_from_peak(close, 20),
            "secuencia",
            "cuánto ha caído desde su máximo del último mes",
        )
        self._add(
            store,
            "days_since_high_60",
            ind.days_since_extreme(close, 60, "high") / 60.0,
            "secuencia",
            "hace cuánto que no hace un máximo",
        )
        self._add(
            store,
            "days_since_low_60",
            ind.days_since_extreme(close, 60, "low") / 60.0,
            "secuencia",
            "hace cuánto que no hace un mínimo",
        )
        self._add(
            store,
            "up_days_ratio_20",
            (returns > 0).rolling(20, min_periods=20).mean(),
            "secuencia",
            "qué proporción de los últimos días cerró en verde",
        )

    def _calendar(self, store, index: pd.DatetimeIndex) -> None:
        # El calendario se conoce de antemano: no es información del futuro.
        day = pd.Series(index.dayofweek, index=index).astype(float)
        self._add(store, "dow_sin", np.sin(2 * np.pi * day / 5.0), "calendario", "el día de la semana")
        self._add(store, "dow_cos", np.cos(2 * np.pi * day / 5.0), "calendario", "el día de la semana")
        month = pd.Series(index.month, index=index).astype(float)
        self._add(store, "month_sin", np.sin(2 * np.pi * month / 12.0), "calendario", "la época del año")
        self._add(store, "month_cos", np.cos(2 * np.pi * month / 12.0), "calendario", "la época del año")

    def _cross_asset(self, store, frame, returns, companions: dict[str, MarketData]) -> None:
        labels = {
            "benchmark": "el mercado en general",
            "sector": "su sector",
            "volatility_index": "el índice del miedo (VIX)",
        }
        for role, market in companions.items():
            aligned = align_companion(frame, market.frame)
            other_close = aligned["close"]
            if other_close.notna().sum() < 120:
                self.skipped[f"cross_{role}"] = "serie de contexto demasiado corta tras alinear"
                continue
            label = labels.get(role, role)
            other_returns = other_close.pct_change()

            if role == "volatility_index":
                self._add(store, "vix_level", other_close / 100.0, "contexto", f"el nivel de {label}")
                self._add(
                    store,
                    "vix_change_1d",
                    other_returns,
                    "contexto",
                    f"si {label} subió o bajó hoy",
                )
                self._add(
                    store,
                    "vix_percentile_252",
                    ind.rolling_percentile(other_close, 252),
                    "contexto",
                    f"qué tan alto está {label} frente a su propio año",
                )
                continue

            self._add(store, f"{role}_ret_1d", other_returns, "contexto", f"lo que hizo hoy {label}")
            self._add(
                store,
                f"{role}_ret_5d",
                other_close.pct_change(5),
                "contexto",
                f"lo que hizo {label} en la última semana",
            )
            self._add(
                store,
                f"{role}_vol_20",
                ind.realized_volatility(other_returns, 20),
                "contexto",
                f"qué tan movido está {label}",
            )
            self._add(
                store,
                f"{role}_relative_strength_20",
                (frame["close"].pct_change(20) - other_close.pct_change(20)),
                "contexto",
                f"si va mejor o peor que {label}",
            )
            rolling_corr = returns.rolling(60, min_periods=40).corr(other_returns)
            self._add(
                store,
                f"{role}_corr_60",
                rolling_corr,
                "contexto",
                f"qué tanto se mueve junto con {label}",
            )
            covariance = returns.rolling(60, min_periods=40).cov(other_returns)
            variance = other_returns.rolling(60, min_periods=40).var(ddof=1)
            self._add(
                store,
                f"{role}_beta_60",
                covariance / variance.replace(0, np.nan),
                "contexto",
                f"cuánto amplifica los movimientos de {label}",
            )


def build_features(
    market: MarketData, companions: dict[str, MarketData] | None = None
) -> FeatureMatrix:
    return FeatureBuilder().build(market, companions)
