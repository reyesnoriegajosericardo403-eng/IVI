"""Traducción de variables técnicas a español de todos los días.

Cada frase se construye con el número real que calculó el motor. Si una
variable no tiene traducción escrita a mano, se usa su descripción genérica
antes que inventar una interpretación.
"""

from __future__ import annotations

from typing import Callable

import numpy as np


def _pct(value: float, decimals: int = 1) -> str:
    return f"{value * 100:.{decimals}f}%".replace(".0%", "%")


def _direction_word(value: float, up: str = "subió", down: str = "bajó") -> str:
    return up if value >= 0 else down


def _return_phrase(window: str) -> Callable[[float], str]:
    def phrase(value: float) -> str:
        verb = _direction_word(value)
        return f"En {window} {verb} {_pct(abs(value))}."

    return phrase


def _sma_phrase(window: int) -> Callable[[float], str]:
    def phrase(value: float) -> str:
        if value >= 0:
            return f"Está {_pct(abs(value))} por encima de su precio promedio de {window} sesiones."
        return f"Está {_pct(abs(value))} por debajo de su precio promedio de {window} sesiones."

    return phrase


def _rsi_phrase(value: float) -> str:
    level = value * 100
    if level <= 30:
        return f"Está muy vendido: su indicador de fuerza está en {level:.0f} de 100 (30 o menos es zona de sobreventa)."
    if level >= 70:
        return f"Está muy comprado: su indicador de fuerza está en {level:.0f} de 100 (70 o más es zona de sobrecompra)."
    return f"Su indicador de fuerza está en {level:.0f} de 100, en terreno neutral."


def _volume_phrase(value: float) -> str:
    if value >= 1.6:
        return f"Hoy se operó {value:.1f} veces el volumen habitual: hay mucha más gente involucrada de lo normal."
    if value <= 0.6:
        return f"Hoy se operó apenas {value:.1f} veces el volumen habitual: hay poco interés."
    return f"El volumen está en {value:.1f} veces lo habitual, dentro de lo normal."


def _shock_phrase(value: float) -> str:
    magnitude = abs(value)
    verb = "una subida" if value > 0 else "una caída"
    if magnitude >= 2:
        return f"El último movimiento fue {verb} {magnitude:.1f} veces más grande de lo normal para este activo: un golpe fuerte."
    if magnitude >= 1:
        return f"El último movimiento fue {verb} algo mayor de lo normal ({magnitude:.1f} veces su tamaño típico)."
    return f"El último movimiento fue {verb} pequeña para lo que acostumbra este activo."


def _vol_percentile_phrase(value: float) -> str:
    if value >= 0.8:
        return f"Está más movido que el {value:.0%} de los días del último año: momento agitado."
    if value <= 0.2:
        return f"Está más tranquilo que de costumbre (más calmado que el {1 - value:.0%} de los días del último año)."
    return f"Su nivel de movimiento está en el término medio de su último año (percentil {value:.0%})."


def _vol_phrase(value: float) -> str:
    return f"Su movimiento típico anualizado ronda el {_pct(value, 0)}."


def _drawdown_phrase(value: float) -> str:
    if value <= -0.01:
        return f"Está {_pct(abs(value))} por debajo de su mejor precio del último año."
    return "Está prácticamente en su mejor precio del último año."


def _dist_high_phrase(window: int) -> Callable[[float], str]:
    def phrase(value: float) -> str:
        if value >= -0.005:
            return f"Está tocando su máximo de las últimas {window} sesiones."
        return f"Le falta {_pct(abs(value))} para volver a su máximo de {window} sesiones."

    return phrase


def _dist_low_phrase(window: int) -> Callable[[float], str]:
    def phrase(value: float) -> str:
        if value <= 0.005:
            return f"Está pegado a su mínimo de las últimas {window} sesiones."
        return f"Está {_pct(abs(value))} arriba de su mínimo de {window} sesiones."

    return phrase


def _streak_phrase(direction: str) -> Callable[[float], str]:
    def phrase(value: float) -> str:
        days = int(round(value))
        if days <= 0:
            return f"Hoy rompió la racha: no {direction} de forma consecutiva."
        if days == 1:
            return f"Lleva un día {direction}."
        return f"Lleva {days} días seguidos {direction}."

    return phrase


def _benchmark_phrase(value: float) -> str:
    verb = _direction_word(value)
    return f"El mercado en general {verb} {_pct(abs(value))} en la última sesión."


def _benchmark_week_phrase(value: float) -> str:
    verb = _direction_word(value)
    return f"El mercado en general {verb} {_pct(abs(value))} en la última semana."


def _vix_level_phrase(value: float) -> str:
    return f"El índice del miedo (VIX) está en {value * 100:.0f} puntos."


def _vix_change_phrase(value: float) -> str:
    verb = "subió" if value >= 0 else "bajó"
    return f"El miedo del mercado {verb} {_pct(abs(value))} en la última sesión."


def _relative_strength_phrase(value: float) -> str:
    if value >= 0:
        return f"En el último mes va {_pct(abs(value))} mejor que su mercado de referencia."
    return f"En el último mes va {_pct(abs(value))} peor que su mercado de referencia."


def _beta_phrase(value: float) -> str:
    if value >= 1.2:
        return f"Amplifica los movimientos del mercado: se mueve {value:.1f} veces lo que se mueve el índice."
    if value <= 0.8:
        return f"Se mueve menos que el mercado ({value:.1f} veces lo que se mueve el índice)."
    return f"Se mueve más o menos igual que el mercado ({value:.1f} veces)."


def _correlation_phrase(value: float) -> str:
    if value >= 0.6:
        return f"Últimamente se mueve casi de la mano del mercado (correlación {value:.2f})."
    if value <= 0.1:
        return f"Últimamente se mueve por su cuenta, casi sin relación con el mercado (correlación {value:.2f})."
    return f"Su relación con el mercado es moderada (correlación {value:.2f})."


def _bollinger_pct_phrase(value: float) -> str:
    if value >= 1:
        return "El precio se salió por arriba de su rango normal."
    if value <= 0:
        return "El precio se salió por abajo de su rango normal."
    return f"Dentro de su rango normal, está en la parte {'alta' if value > 0.5 else 'baja'} ({value:.0%})."


def _bollinger_width_phrase(value: float) -> str:
    return f"Su rango de movimiento habitual abarca {_pct(value)} del precio."


def _gap_phrase(value: float) -> str:
    if value >= 0.03:
        return f"Abrió con un salto de {_pct(value)} respecto del cierre anterior: pasó algo entre sesiones."
    return f"Abrió casi donde cerró el día anterior (diferencia de {_pct(value)})."


def _overnight_phrase(value: float) -> str:
    verb = _direction_word(value, "arriba", "abajo")
    return f"Abrió {_pct(abs(value))} {verb} del cierre anterior."


def _close_position_phrase(value: float) -> str:
    if value >= 0.75:
        return "Cerró cerca de lo más alto del día: la sesión terminó con fuerza."
    if value <= 0.25:
        return "Cerró cerca de lo más bajo del día: la sesión terminó débil."
    return "Cerró a media altura del rango del día."


def _up_days_phrase(value: float) -> str:
    return f"De los últimos 20 días, cerró en verde el {value:.0%}."


def _atr_phrase(value: float) -> str:
    return f"En un día normal se mueve alrededor de {_pct(value)}."


def _macd_hist_phrase(value: float) -> str:
    if value > 0:
        return "Su impulso de corto plazo va ganando fuerza."
    return "Su impulso de corto plazo va perdiendo fuerza."


def _days_since_phrase(kind: str) -> Callable[[float], str]:
    def phrase(value: float) -> str:
        days = int(round(value * 60))
        return f"Hace {days} sesiones que no marca un {kind} de dos meses."

    return phrase


#: Diccionario variable → frase. Lo que no está aquí usa su descripción base.
PHRASES: dict[str, Callable[[float], str]] = {
    "ret_1d": _return_phrase("la última sesión"),
    "ret_2d": _return_phrase("las últimas 2 sesiones"),
    "ret_3d": _return_phrase("las últimas 3 sesiones"),
    "ret_5d": _return_phrase("la última semana"),
    "ret_10d": _return_phrase("las últimas 2 semanas"),
    "ret_20d": _return_phrase("el último mes"),
    "ret_60d": _return_phrase("los últimos 3 meses"),
    "ret_120d": _return_phrase("los últimos 6 meses"),
    "roc_10": _return_phrase("las últimas 2 semanas"),
    "roc_20": _return_phrase("el último mes"),
    "roc_60": _return_phrase("los últimos 3 meses"),
    "ret_overnight": _overnight_phrase,
    "ret_intraday": _return_phrase("la sesión de hoy, de apertura a cierre"),
    "gap_abs": _gap_phrase,
    "close_position_in_range": _close_position_phrase,
    "sma_ratio_5": _sma_phrase(5),
    "sma_ratio_10": _sma_phrase(10),
    "sma_ratio_20": _sma_phrase(20),
    "sma_ratio_50": _sma_phrase(50),
    "sma_ratio_200": _sma_phrase(200),
    "rsi_7": _rsi_phrase,
    "rsi_14": _rsi_phrase,
    "rsi_28": _rsi_phrase,
    "macd_hist_norm": _macd_hist_phrase,
    "atr_pct_14": _atr_phrase,
    "bollinger_pct_b": _bollinger_pct_phrase,
    "bollinger_width": _bollinger_width_phrase,
    "rel_volume_20": _volume_phrase,
    "dollar_volume_ratio": lambda v: (
        f"El dinero que cambió de manos hoy fue {v:.1f} veces lo normal."
    ),
    "volume_change": lambda v: (
        f"El volumen {'creció' if v >= 0 else 'cayó'} {_pct(abs(v))} respecto de ayer."
    ),
    "volume_zscore_60": lambda v: (
        f"El volumen de hoy es {abs(v):.1f} desviaciones "
        f"{'por encima' if v >= 0 else 'por debajo'} de lo habitual."
    ),
    "sma_cross_20_50": lambda v: (
        "Su tendencia de corto plazo va por encima de la de mediano plazo."
        if v >= 0
        else "Su tendencia de corto plazo va por debajo de la de mediano plazo."
    ),
    "macd_norm": lambda v: (
        "Su tendencia de fondo es alcista." if v >= 0 else "Su tendencia de fondo es bajista."
    ),
    "macd_signal_norm": lambda v: (
        "La señal de tendencia está en terreno positivo."
        if v >= 0
        else "La señal de tendencia está en terreno negativo."
    ),
    "range_pct": lambda v: f"El rango de hoy abarcó {_pct(v)} del precio.",
    "benchmark_vol_20": lambda v: f"El mercado en general se mueve {_pct(v, 0)} anualizado.",
    "sector_vol_20": lambda v: f"Su sector se mueve {_pct(v, 0)} anualizado.",
    "sector_corr_60": _correlation_phrase,
    "sector_beta_60": _beta_phrase,
    "shock_zscore": _shock_phrase,
    "prev_ret_abs": lambda v: f"El último movimiento, en tamaño, fue de {_pct(v)}.",
    "vol_5": _vol_phrase,
    "vol_10": _vol_phrase,
    "vol_20": _vol_phrase,
    "vol_60": _vol_phrase,
    "parkinson_vol_20": _vol_phrase,
    "downside_vol_20": lambda v: f"Sus bajadas tienen un tamaño típico anualizado de {_pct(v, 0)}.",
    "vol_percentile_252": _vol_percentile_phrase,
    "vol_ratio_5_60": lambda v: (
        f"Se está moviendo {v:.1f} veces más que su promedio de los últimos meses."
        if v >= 1
        else f"Se está moviendo {v:.1f} veces lo de su promedio: más tranquilo que de costumbre."
    ),
    "drawdown_252": _drawdown_phrase,
    "drawdown_20": lambda v: f"Está {_pct(abs(v))} por debajo de su máximo del último mes.",
    "dist_high_20": _dist_high_phrase(20),
    "dist_high_60": _dist_high_phrase(60),
    "dist_high_252": _dist_high_phrase(252),
    "dist_low_20": _dist_low_phrase(20),
    "dist_low_60": _dist_low_phrase(60),
    "dist_low_252": _dist_low_phrase(252),
    "consecutive_up": _streak_phrase("subiendo"),
    "consecutive_down": _streak_phrase("bajando"),
    "up_days_ratio_20": _up_days_phrase,
    "days_since_high_60": _days_since_phrase("máximo"),
    "days_since_low_60": _days_since_phrase("mínimo"),
    "benchmark_ret_1d": _benchmark_phrase,
    "benchmark_ret_5d": _benchmark_week_phrase,
    "benchmark_relative_strength_20": _relative_strength_phrase,
    "benchmark_beta_60": _beta_phrase,
    "benchmark_corr_60": _correlation_phrase,
    "sector_ret_1d": lambda v: f"Su sector o activo relacionado {_direction_word(v)} {_pct(abs(v))} en la última sesión.",
    "sector_ret_5d": lambda v: f"Su sector o activo relacionado {_direction_word(v)} {_pct(abs(v))} en la última semana.",
    "sector_relative_strength_20": lambda v: (
        f"En el último mes va {_pct(abs(v))} {'mejor' if v >= 0 else 'peor'} que su sector."
    ),
    "vix_level": _vix_level_phrase,
    "vix_change_1d": _vix_change_phrase,
    "vix_percentile_252": lambda v: f"El miedo del mercado está más alto que en el {v:.0%} de los días del último año.",
    "dow_sin": lambda v: "El día de la semana también entra en la cuenta.",
    "dow_cos": lambda v: "El día de la semana también entra en la cuenta.",
    "month_sin": lambda v: "La época del año también entra en la cuenta.",
    "month_cos": lambda v: "La época del año también entra en la cuenta.",
}


def describe(feature: str, value: float, fallback: str = "") -> str:
    """Frase en español llano para una variable y su valor de hoy."""
    if not np.isfinite(value):
        return fallback or feature
    builder = PHRASES.get(feature)
    if builder is None:
        return fallback or feature
    try:
        return builder(float(value))
    except Exception:  # noqa: BLE001 - una frase rota no debe tumbar la respuesta
        return fallback or feature
