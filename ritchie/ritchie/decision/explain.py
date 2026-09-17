"""Generación de la explicación en lenguaje simple.

Regla absoluta: **nunca inventar explicaciones post-hoc**. Cada frase que sale
de aquí está atada a un número que el motor calculó:

* los factores vienen del efecto medido de cada variable sobre el modelo ya
  entrenado (no de una interpretación a ojo),
* las cifras históricas vienen del conteo real de días parecidos,
* si no hay un número detrás, no hay frase.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..models.base import Contribution
from . import phrases


def probability_in_words(probability: float) -> str:
    """La forma más clara de decir una probabilidad: contando días."""
    days = int(round(probability * 100))
    if days <= 0:
        return "Prácticamente ninguno de cada 100 días parecidos terminó así."
    if days >= 100:
        return "Casi todos los días parecidos terminaron así, pero nunca es el 100%."
    return f"De cada 100 días parecidos al de hoy, en {days} pasó y en {100 - days} no."


def probability_words_simple(probability: float) -> str:
    """Una sola palabra para la magnitud, sin tecnicismos."""
    if probability < 0.10:
        return "muy poco probable"
    if probability < 0.25:
        return "poco probable"
    if probability < 0.45:
        return "posible, pero no lo más común"
    if probability < 0.55:
        return "una moneda al aire"
    if probability < 0.75:
        return "más probable que lo contrario"
    if probability < 0.90:
        return "bastante probable"
    return "muy probable"


@dataclass
class Narrative:
    headline: str
    simple: str
    grandma: str
    factors: list[dict] = field(default_factory=list)
    means: list[str] = field(default_factory=list)
    does_not_mean: list[str] = field(default_factory=list)
    disclaimer: str = "Es una estimación estadística, no una garantía."

    def to_dict(self) -> dict:
        return {
            "titular": self.headline,
            "explicacion_simple": self.simple,
            "explicacion_para_cualquiera": self.grandma,
            "factores": self.factors,
            "que_significa": self.means,
            "que_no_significa": self.does_not_mean,
            "advertencia": self.disclaimer,
        }


def build_factors(
    contributions: list[Contribution],
    today: pd.Series,
    descriptions: dict[str, str],
    limit: int = 5,
) -> list[dict]:
    """Convierte los aportes medidos en frases con su número real."""
    factors: list[dict] = []
    seen: set[str] = set()
    seen_text: set[str] = set()
    for contribution in contributions:
        if contribution.feature in seen:
            continue
        seen.add(contribution.feature)
        if contribution.feature == "dias_parecidos":
            text = contribution.description
        else:
            value = float(today.get(contribution.feature, contribution.value))
            text = phrases.describe(
                contribution.feature, value, descriptions.get(contribution.feature, "")
            )
        # Dos variables distintas pueden contar lo mismo con otras palabras:
        # repetirlo confundiría en vez de aclarar.
        if text in seen_text:
            continue
        seen_text.add(text)
        factors.append(
            {
                "texto": text,
                "variable": contribution.feature,
                "valor": round(float(contribution.value), 6),
                "empuja": "hacia arriba" if contribution.direction == "sube" else "hacia abajo",
                "peso": round(abs(float(contribution.effect)), 6),
            }
        )
        if len(factors) >= limit:
            break
    return factors


def context_facts(today: pd.Series, descriptions: dict[str, str], limit: int = 4) -> list[str]:
    """Hechos del estado actual que siempre valen la pena contar."""
    preferred = [
        "ret_5d",
        "shock_zscore",
        "vol_percentile_252",
        "rel_volume_20",
        "drawdown_252",
        "rsi_14",
        "benchmark_ret_1d",
        "consecutive_down",
        "consecutive_up",
    ]
    facts: list[str] = []
    for name in preferred:
        if name not in today.index:
            continue
        value = today[name]
        if not np.isfinite(value):
            continue
        text = phrases.describe(name, float(value), descriptions.get(name, ""))
        if text and text not in facts:
            facts.append(text)
        if len(facts) >= limit:
            break
    return facts


def build_narrative(
    *,
    symbol: str,
    target_description: str,
    probability: float | None,
    base_rate: float | None,
    opposite_probability: float | None,
    confidence_label: str,
    has_signal: bool,
    blockers: list[dict],
    contributions: list[Contribution],
    today: pd.Series,
    descriptions: dict[str, str],
    analog_evidence: dict | None,
    scenario: dict | None,
    horizon_text: str,
    is_synthetic: bool,
) -> Narrative:
    """Arma el relato completo con los hechos ya calculados."""
    if not has_signal or probability is None:
        reasons = [b["motivo"] for b in blockers[:3]]
        headline = "No hay suficiente evidencia para dar una respuesta confiable."
        simple = (
            "RITCHIE revisó la historia de este activo y no encontró una base sólida para "
            "afirmar nada sobre " + horizon_text + ". "
        )
        if reasons:
            simple += "El motivo principal: " + reasons[0].lower() + "."
        grandma = (
            "Imagina que te pregunto si va a llover mañana, pero no tengo termómetro ni he visto "
            "el cielo. Lo honesto es decirte que no sé, no inventarte un número."
        )
        means = [
            "No significa que el activo vaya a bajar ni a subir.",
            "Significa que, con esta información, cualquier número sería un invento.",
        ]
        if base_rate is not None:
            means.append(
                f"Lo único que se puede decir con datos: históricamente, {target_description} "
                f"ocurrió el {base_rate:.0%} de las veces."
            )
        return Narrative(
            headline=headline,
            simple=simple,
            grandma=grandma,
            factors=[
                {
                    "texto": b["motivo"] + ".",
                    "variable": b["clave"],
                    "valor": 0.0,
                    "empuja": "",
                    "peso": 0.0,
                }
                for b in blockers[:4]
            ],
            means=means,
            does_not_mean=[
                "No es una recomendación de vender.",
                "No es una predicción escondida.",
            ],
        )

    percent = f"{probability:.0%}"
    direction_is_up = "suba" in target_description
    if probability >= 0.5:
        headline = f"El escenario que estás preguntando es el más probable: {percent}."
    elif probability >= 0.25:
        headline = f"Es posible, pero no es lo más probable: {percent}."
    else:
        headline = f"Es poco probable: {percent}."

    lift_text = ""
    if base_rate is not None and base_rate > 0:
        ratio = probability / base_rate
        if ratio >= 1.25:
            lift_text = (
                f" Eso es {ratio:.1f} veces más de lo habitual para este activo "
                f"(su promedio histórico es {base_rate:.0%})."
            )
        elif ratio <= 0.8:
            lift_text = (
                f" Eso es menos de lo habitual para este activo "
                f"(su promedio histórico es {base_rate:.0%})."
            )
        else:
            lift_text = f" Es prácticamente su promedio histórico ({base_rate:.0%})."

    simple = (
        f"Según el comportamiento histórico de {symbol} y sus condiciones de hoy, "
        f"RITCHIE estima una probabilidad de {percent} de {target_description}."
        + lift_text
        + f" La confianza en esta estimación es {confidence_label}."
    )

    grandma = (
        f"Piensa en una bolsa con 100 canicas. {probability_in_words(probability)} "
        f"Es decir, {probability_words_simple(probability)}. "
        "Nadie sabe qué canica va a salir mañana: solo sabemos cuántas hay de cada color."
    )

    factors = build_factors(contributions, today, descriptions)
    if not factors:
        factors = [
            {"texto": fact, "variable": "", "valor": 0.0, "empuja": "", "peso": 0.0}
            for fact in context_facts(today, descriptions)
        ]

    means = [probability_in_words(probability)]
    if opposite_probability is not None:
        means.append(
            f"El movimiento contrario tiene una probabilidad de {opposite_probability:.0%}: "
            "conviene mirar los dos lados."
        )
    if analog_evidence and analog_evidence.get("vecinos"):
        means.append(
            f"Se encontraron {analog_evidence['vecinos']} días históricos parecidos a hoy; "
            f"en {analog_evidence['aciertos']} de ellos el movimiento sí ocurrió."
        )
    if scenario:
        low = scenario.get("escenarios", {}).get("pesimista", {})
        high = scenario.get("escenarios", {}).get("optimista", {})
        if low and high:
            means.append(
                f"En 8 de cada 10 escenarios simulados, el precio termina entre "
                f"{low['precio']:.2f} y {high['precio']:.2f}."
            )

    does_not_mean = [
        "No significa que vaya a pasar: una probabilidad alta también falla.",
        "No es una recomendación de compra ni de venta.",
        "No considera noticias, resultados ni nada que no esté en el precio y el volumen.",
    ]
    if is_synthetic:
        does_not_mean.insert(
            0,
            "IMPORTANTE: esta corrida usa una serie simulada, no un activo real. "
            "No sirve para decidir nada con dinero.",
        )

    return Narrative(
        headline=headline,
        simple=simple,
        grandma=grandma,
        factors=factors,
        means=means,
        does_not_mean=does_not_mean,
    )
