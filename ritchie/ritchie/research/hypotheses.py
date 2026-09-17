"""Descubrimiento de patrones que el usuario no pidió.

RITCHIE prueba un catálogo fijo de condiciones (definido *antes* de ver los
datos, para no ir de pesca) y mide si el evento ocurre con frecuencia distinta
cuando la condición se cumple.

Tres filtros para no engañarse:

1. **Corrección por pruebas múltiples**: se prueban ~20 ideas; alguna dará
   p < 0.05 por azar. Benjamini-Hochberg lo controla.
2. **Tamaño de efecto**: un patrón puede ser significativo y a la vez tan
   pequeño que no sirva para nada.
3. **Confirmación fuera de muestra**: el patrón se descubre en el periodo de
   desarrollo y se verifica en un periodo posterior que no participó.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np
import pandas as pd

from ..statistics.tests import (
    benjamini_hochberg,
    binomial_event_test,
    bootstrap_proportion_ci,
    cohens_h,
    effect_size_label,
)

#: Mínimo de casos para siquiera considerar una condición.
MIN_CASES = 40
#: Efecto mínimo (Cohen's h) para considerar el patrón prácticamente relevante.
MIN_EFFECT = 0.20


@dataclass
class Condition:
    """Una hipótesis concreta y comprobable."""

    key: str
    label: str
    explanation: str
    requires: tuple[str, ...]
    predicate: Callable[[pd.DataFrame], pd.Series]


@dataclass
class Hypothesis:
    """Resultado de probar una condición."""

    key: str
    label: str
    explanation: str
    n_dev: int
    rate_dev: float
    base_dev: float
    lift: float
    p_value: float
    effect: float
    effect_label: str
    ci: tuple[float, float]
    survives_correction: bool = False
    n_test: int = 0
    rate_test: float | None = None
    base_test: float | None = None
    confirmed_out_of_sample: bool | None = None
    active_today: bool = False

    @property
    def useful(self) -> bool:
        """Solo cuenta si es significativa, grande y se confirma fuera de muestra."""
        return bool(
            self.survives_correction
            and abs(self.effect) >= MIN_EFFECT
            and self.confirmed_out_of_sample is True
        )

    def to_dict(self) -> dict:
        return {
            "clave": self.key,
            "patron": self.label,
            "explicacion": self.explanation,
            "casos_desarrollo": self.n_dev,
            "frecuencia_con_la_condicion": round(self.rate_dev, 4),
            "frecuencia_base": round(self.base_dev, 4),
            "multiplicador": round(self.lift, 3),
            "p_valor": round(self.p_value, 5),
            "tamano_efecto": round(self.effect, 4),
            "lectura_del_efecto": self.effect_label,
            "ic_95": [round(self.ci[0], 4), round(self.ci[1], 4)],
            "sobrevive_correccion": self.survives_correction,
            "casos_prueba": self.n_test,
            "frecuencia_prueba": round(self.rate_test, 4) if self.rate_test is not None else None,
            "frecuencia_base_prueba": round(self.base_test, 4) if self.base_test is not None else None,
            "confirmado_fuera_de_muestra": self.confirmed_out_of_sample,
            "activo_hoy": self.active_today,
            "util": self.useful,
        }


def _quantile_predicate(column: str, q: float, above: bool) -> Callable[[pd.DataFrame], pd.Series]:
    def predicate(frame: pd.DataFrame) -> pd.Series:
        threshold = frame[column].quantile(q)
        return frame[column] >= threshold if above else frame[column] <= threshold

    return predicate


#: Catálogo fijo. Se define aquí, en el código, no al vuelo mirando resultados.
CATALOG: list[Condition] = [
    Condition(
        "caida_extrema",
        "Después de una caída extrema para este activo",
        "El movimiento de la última sesión fue una caída de más de 2 desviaciones típicas.",
        ("shock_zscore",),
        lambda f: f["shock_zscore"] <= -2.0,
    ),
    Condition(
        "subida_extrema",
        "Después de una subida extrema para este activo",
        "El movimiento de la última sesión fue una subida de más de 2 desviaciones típicas.",
        ("shock_zscore",),
        lambda f: f["shock_zscore"] >= 2.0,
    ),
    Condition(
        "caida_moderada",
        "Después de un día claramente malo",
        "La última sesión cayó más de una desviación típica de este activo.",
        ("shock_zscore",),
        lambda f: f["shock_zscore"] <= -1.0,
    ),
    Condition(
        "subida_moderada",
        "Después de un día claramente bueno",
        "La última sesión subió más de una desviación típica de este activo.",
        ("shock_zscore",),
        lambda f: f["shock_zscore"] >= 1.0,
    ),
    Condition(
        "semana_muy_mala",
        "Después de una semana muy mala",
        "Acumula una caída fuerte en las últimas 5 sesiones (peor 10% de su historia).",
        ("ret_5d",),
        _quantile_predicate("ret_5d", 0.10, above=False),
    ),
    Condition(
        "semana_muy_buena",
        "Después de una semana muy buena",
        "Acumula una subida fuerte en las últimas 5 sesiones (mejor 10% de su historia).",
        ("ret_5d",),
        _quantile_predicate("ret_5d", 0.90, above=True),
    ),
    Condition(
        "en_maximos",
        "Cuando está rompiendo máximos del año",
        "El precio está a menos de 1% de su máximo de las últimas 252 sesiones.",
        ("dist_high_252",),
        lambda f: f["dist_high_252"] >= -0.01,
    ),
    Condition(
        "en_minimos",
        "Cuando está en mínimos del año",
        "El precio está a menos de 1% de su mínimo de las últimas 252 sesiones.",
        ("dist_low_252",),
        lambda f: f["dist_low_252"] <= 0.01,
    ),
    Condition(
        "volumen_inusual",
        "Cuando el volumen se dispara",
        "Se operó más del doble del volumen habitual de las últimas 20 sesiones.",
        ("rel_volume_20",),
        lambda f: f["rel_volume_20"] >= 2.0,
    ),
    Condition(
        "volumen_con_subida",
        "Cuando sube con volumen alto",
        "El precio cerró en verde con volumen 50% por encima de lo normal.",
        ("rel_volume_20", "ret_1d"),
        lambda f: (f["rel_volume_20"] >= 1.5) & (f["ret_1d"] > 0),
    ),
    Condition(
        "volatilidad_alta",
        "En periodos de volatilidad alta",
        "Su volatilidad está en el 20% más alto de su propio año.",
        ("vol_percentile_252",),
        lambda f: f["vol_percentile_252"] >= 0.80,
    ),
    Condition(
        "volatilidad_baja",
        "En periodos de calma",
        "Su volatilidad está en el 20% más bajo de su propio año.",
        ("vol_percentile_252",),
        lambda f: f["vol_percentile_252"] <= 0.20,
    ),
    Condition(
        "sobrevendido",
        "Cuando está sobrevendido",
        "El RSI de 14 sesiones está por debajo de 30.",
        ("rsi_14",),
        lambda f: f["rsi_14"] <= 0.30,
    ),
    Condition(
        "sobrecomprado",
        "Cuando está sobrecomprado",
        "El RSI de 14 sesiones está por encima de 70.",
        ("rsi_14",),
        lambda f: f["rsi_14"] >= 0.70,
    ),
    Condition(
        "tres_bajadas",
        "Tras tres o más sesiones seguidas a la baja",
        "Lleva al menos tres cierres consecutivos en rojo.",
        ("consecutive_down",),
        lambda f: f["consecutive_down"] >= 3,
    ),
    Condition(
        "tres_subidas",
        "Tras tres o más sesiones seguidas al alza",
        "Lleva al menos tres cierres consecutivos en verde.",
        ("consecutive_up",),
        lambda f: f["consecutive_up"] >= 3,
    ),
    Condition(
        "bandas_comprimidas",
        "Cuando el rango se comprime",
        "Las bandas de Bollinger están en el 20% más estrecho de su historia.",
        ("bollinger_width",),
        _quantile_predicate("bollinger_width", 0.20, above=False),
    ),
    Condition(
        "hueco_grande",
        "Cuando abre con un hueco grande",
        "La apertura se separó del cierre anterior más que en el 90% de los días.",
        ("gap_abs",),
        _quantile_predicate("gap_abs", 0.90, above=True),
    ),
    Condition(
        "lejos_de_maximos",
        "Cuando está muy lejos de sus máximos",
        "Acumula una caída de más de 40% desde su máximo del último año.",
        ("drawdown_252",),
        lambda f: f["drawdown_252"] <= -0.40,
    ),
    Condition(
        "mercado_cae_fuerte",
        "Cuando el mercado en general cae fuerte",
        "El índice de referencia cayó más de 1.5% en la sesión.",
        ("benchmark_ret_1d",),
        lambda f: f["benchmark_ret_1d"] <= -0.015,
    ),
    Condition(
        "mercado_sube_fuerte",
        "Cuando el mercado en general sube fuerte",
        "El índice de referencia subió más de 1.5% en la sesión.",
        ("benchmark_ret_1d",),
        lambda f: f["benchmark_ret_1d"] >= 0.015,
    ),
    Condition(
        "miedo_al_alza",
        "Cuando el miedo del mercado se dispara",
        "El VIX subió más de 10% en la sesión.",
        ("vix_change_1d",),
        lambda f: f["vix_change_1d"] >= 0.10,
    ),
    Condition(
        "sector_fuerte",
        "Cuando su sector o activo relacionado va fuerte",
        "El activo relacionado subió más de 2% en la sesión.",
        ("sector_ret_1d",),
        lambda f: f["sector_ret_1d"] >= 0.02,
    ),
]


def discover(
    features: pd.DataFrame,
    y: pd.Series,
    dev_end: pd.Timestamp,
    today_row: pd.Series | None = None,
    alpha: float = 0.10,
) -> list[Hypothesis]:
    """Prueba el catálogo completo y devuelve los patrones ordenados por efecto."""
    common = features.index.intersection(y.index)
    frame = features.loc[common]
    labels = y.loc[common].astype(float)

    dev_mask = frame.index <= dev_end
    test_mask = ~dev_mask
    dev_frame, dev_y = frame[dev_mask], labels[dev_mask]
    test_frame, test_y = frame[test_mask], labels[test_mask]
    if len(dev_y) < 200:
        return []

    base_dev = float(dev_y.mean())
    base_test = float(test_y.mean()) if len(test_y) else None

    found: list[Hypothesis] = []
    for condition in CATALOG:
        if not all(column in frame.columns for column in condition.requires):
            continue
        try:
            dev_selector = condition.predicate(dev_frame).fillna(False).astype(bool)
        except Exception:  # noqa: BLE001 - una condición inválida simplemente no aplica
            continue
        n_dev = int(dev_selector.sum())
        if n_dev < MIN_CASES:
            continue

        rate = float(dev_y[dev_selector].mean())
        test_result = binomial_event_test(int(dev_y[dev_selector].sum()), n_dev, base_dev)
        effect = cohens_h(rate, base_dev)
        ci = bootstrap_proportion_ci(int(dev_y[dev_selector].sum()), n_dev)

        hypothesis = Hypothesis(
            key=condition.key,
            label=condition.label,
            explanation=condition.explanation,
            n_dev=n_dev,
            rate_dev=rate,
            base_dev=base_dev,
            lift=float(rate / base_dev) if base_dev > 1e-9 else float("inf"),
            p_value=float(test_result.p_value),
            effect=float(effect),
            effect_label=effect_size_label(effect),
            ci=ci,
        )

        if len(test_y) >= 40:
            try:
                test_selector = condition.predicate(test_frame).fillna(False).astype(bool)
            except Exception:  # noqa: BLE001
                test_selector = pd.Series(False, index=test_frame.index)
            hypothesis.n_test = int(test_selector.sum())
            if hypothesis.n_test >= 10:
                hypothesis.rate_test = float(test_y[test_selector].mean())
                hypothesis.base_test = base_test
                # Confirmar = mantener el mismo signo del efecto fuera de muestra.
                direction_dev = np.sign(rate - base_dev)
                direction_test = np.sign(hypothesis.rate_test - (base_test or 0.0))
                hypothesis.confirmed_out_of_sample = bool(
                    direction_dev != 0 and direction_dev == direction_test
                )

        if today_row is not None:
            try:
                hypothesis.active_today = bool(
                    condition.predicate(today_row.to_frame().T).fillna(False).iloc[0]
                )
            except Exception:  # noqa: BLE001
                hypothesis.active_today = False

        found.append(hypothesis)

    decisions = benjamini_hochberg([h.p_value for h in found], alpha=alpha)
    for hypothesis, passed in zip(found, decisions):
        hypothesis.survives_correction = bool(passed)

    found.sort(key=lambda h: (h.useful, abs(h.effect)), reverse=True)
    return found
