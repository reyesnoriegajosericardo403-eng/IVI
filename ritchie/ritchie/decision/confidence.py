"""Sistema de confianza.

Una probabilidad de 79% calculada con 30 casos parecidos y un modelo mal
calibrado no vale lo mismo que un 79% calculado con 400 casos y calibración
verificada. Este módulo separa esas dos cosas: la probabilidad dice *qué tan
seguido pasa*; la confianza dice *cuánto creerle a esa probabilidad*.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..config import DecisionConfig

LEVELS = ("muy_baja", "baja", "moderada", "alta", "muy_alta")
LEVEL_LABELS = {
    "muy_baja": "muy baja",
    "baja": "baja",
    "moderada": "moderada",
    "alta": "alta",
    "muy_alta": "muy alta",
}

#: Peso de cada criterio en la confianza final.
WEIGHTS = {
    "calibracion": 0.24,
    "tamano_muestra": 0.18,
    "similitud_historica": 0.16,
    "acuerdo_entre_modelos": 0.14,
    "regimen_de_mercado": 0.10,
    "calidad_de_datos": 0.10,
    "desempeno_fuera_de_muestra": 0.08,
}


@dataclass
class ConfidenceFactor:
    key: str
    label: str
    score: float
    weight: float
    detail: str

    def to_dict(self) -> dict:
        return {
            "criterio": self.key,
            "nombre": self.label,
            "puntaje": round(self.score, 4),
            "peso": self.weight,
            "detalle": self.detail,
        }


@dataclass
class ConfidenceReport:
    score: float
    level: str
    factors: list[ConfidenceFactor] = field(default_factory=list)
    weakest: str = ""

    @property
    def label(self) -> str:
        return LEVEL_LABELS[self.level]

    def to_dict(self) -> dict:
        return {
            "puntaje": round(self.score, 4),
            "nivel": self.level,
            "nivel_texto": self.label,
            "factores": [f.to_dict() for f in self.factors],
            "punto_mas_debil": self.weakest,
        }


def _level_for(score: float) -> str:
    if score < 0.35:
        return "muy_baja"
    if score < 0.50:
        return "baja"
    if score < 0.65:
        return "moderada"
    if score < 0.80:
        return "alta"
    return "muy_alta"


def regime_novelty(history: pd.DataFrame, today: pd.Series) -> dict:
    """¿Se parece hoy a algo que este activo ya haya vivido?

    Se mide la distancia robusta del día de hoy al centro histórico y se
    reporta en qué percentil cae respecto de todos los días anteriores. Un
    percentil cercano a 1 significa "nunca había estado así".
    """
    columns = [c for c in history.columns if history[c].notna().sum() > 100]
    if not columns or len(history) < 120:
        return {"percentil": None, "detalle": "historia insuficiente para medir el régimen"}
    values = history[columns].to_numpy(dtype=float)
    center = np.nanmedian(values, axis=0)
    spread = np.nanpercentile(values, 75, axis=0) - np.nanpercentile(values, 25, axis=0)
    spread = np.where(spread > 1e-9, spread, np.nanstd(values, axis=0) + 1e-9)
    normalized = (values - center) / spread
    distances = np.sqrt(np.nanmean(normalized**2, axis=1))
    today_normalized = (today[columns].to_numpy(dtype=float) - center) / spread
    today_distance = float(np.sqrt(np.nanmean(today_normalized**2)))
    percentile = float((distances <= today_distance).mean())
    return {
        "percentil": percentile,
        "distancia": today_distance,
        "distancia_mediana_historica": float(np.nanmedian(distances)),
        "detalle": (
            "El estado de hoy es más extremo que el "
            f"{percentile:.0%} de los días de su historia."
        ),
    }


def assess_confidence(
    *,
    model_selected: bool = True,
    calibration_ece: float | None,
    calibration_slope: float | None,
    n_oos: int,
    n_events: int,
    analog_evidence: dict | None,
    model_spread: float | None,
    novelty_percentile: float | None,
    data_quality: float,
    test_brier_skill: float | None,
    decision: DecisionConfig,
) -> ConfidenceReport:
    """Combina todos los criterios en un nivel de confianza explicable."""
    factors: list[ConfidenceFactor] = []

    # 1. Calibración
    if calibration_ece is None or not np.isfinite(calibration_ece):
        score = 0.3
        detail = "No se pudo verificar la calibración."
    else:
        score = float(np.clip(1 - calibration_ece / max(decision.max_calibration_error, 1e-6), 0, 1))
        detail = f"Error de calibración {calibration_ece:.1%} (tolerancia {decision.max_calibration_error:.0%})."
        if calibration_slope is not None and np.isfinite(calibration_slope):
            penalty = float(np.clip(1 - abs(calibration_slope - 1.0), 0, 1))
            score = 0.7 * score + 0.3 * penalty
            detail += f" Pendiente de calibración {calibration_slope:.2f} (ideal 1.00)."
    factors.append(
        ConfidenceFactor("calibracion", "Honestidad de la probabilidad", score, WEIGHTS["calibracion"], detail)
    )

    # 2. Tamaño de muestra fuera de muestra
    sample_score = float(np.clip(np.log1p(n_oos) / np.log1p(decision.min_oos_predictions * 6), 0, 1))
    event_score = float(np.clip(n_events / (decision.min_positive_events * 5), 0, 1))
    combined = 0.5 * sample_score + 0.5 * event_score
    factors.append(
        ConfidenceFactor(
            "tamano_muestra",
            "Cantidad de evidencia",
            combined,
            WEIGHTS["tamano_muestra"],
            f"{n_oos} predicciones fuera de muestra con {n_events} ocurrencias reales del evento.",
        )
    )

    # 3. Similitud histórica
    if analog_evidence and analog_evidence.get("vecinos"):
        neighbors = int(analog_evidence["vecinos"])
        distance = float(analog_evidence.get("distancia_mediana", 1.0))
        closeness = float(np.clip(1.0 - distance / 2.0, 0.0, 1.0))
        score = float(np.clip(0.5 * min(neighbors / 80.0, 1.0) + 0.5 * closeness, 0, 1))
        detail = (
            f"{neighbors} días históricos parecidos a hoy "
            f"(distancia típica {distance:.2f}; 0 sería idéntico)."
        )
    else:
        score, detail = 0.35, "No se encontraron días históricos comparables."
    factors.append(
        ConfidenceFactor("similitud_historica", "Parecido con el pasado", score, WEIGHTS["similitud_historica"], detail)
    )

    # 4. Acuerdo entre modelos
    if model_spread is None or not np.isfinite(model_spread):
        score, detail = 0.4, "No se pudo medir el acuerdo entre modelos."
    else:
        score = float(np.clip(1 - model_spread / max(decision.max_model_disagreement, 1e-6), 0, 1))
        detail = f"Las probabilidades de los modelos se separan {model_spread:.1%} entre sí."
    factors.append(
        ConfidenceFactor("acuerdo_entre_modelos", "Coincidencia entre modelos", score, WEIGHTS["acuerdo_entre_modelos"], detail)
    )

    # 5. Régimen de mercado
    if novelty_percentile is None:
        score, detail = 0.4, "No se pudo evaluar si el momento actual es atípico."
    else:
        score = float(np.clip((decision.max_regime_novelty - novelty_percentile) / 0.30 + 0.5, 0, 1))
        detail = f"El estado actual es más extremo que el {novelty_percentile:.0%} de su historia."
    factors.append(
        ConfidenceFactor("regimen_de_mercado", "Normalidad del momento", score, WEIGHTS["regimen_de_mercado"], detail)
    )

    # 6. Calidad de los datos
    factors.append(
        ConfidenceFactor(
            "calidad_de_datos",
            "Calidad de los datos",
            float(np.clip(data_quality, 0, 1)),
            WEIGHTS["calidad_de_datos"],
            f"Puntaje de calidad de la serie: {data_quality:.0%}.",
        )
    )

    # 7. Desempeño en la prueba final
    if test_brier_skill is None:
        score, detail = 0.4, "Sin tramo de prueba final suficiente."
    else:
        score = float(np.clip(0.5 + test_brier_skill / 0.06 * 0.5, 0, 1))
        detail = (
            f"En el periodo que jamás se usó para elegir nada, la mejora sobre la tasa base "
            f"fue de {test_brier_skill:+.2%}."
        )
    factors.append(
        ConfidenceFactor("desempeno_fuera_de_muestra", "Desempeño en datos nunca vistos", score, WEIGHTS["desempeno_fuera_de_muestra"], detail)
    )

    total = float(sum(f.score * f.weight for f in factors))
    weakest = min(factors, key=lambda f: f.score)

    if not model_selected:
        # Sin un modelo que haya demostrado aportar información no hay
        # probabilidad en la que confiar: la confianza no es "alta", es nula.
        factors.append(
            ConfidenceFactor(
                "modelo_util",
                "Existe un modelo que aporta información",
                0.0,
                0.0,
                "Ningún modelo superó a la simple frecuencia histórica, así que no hay "
                "ninguna probabilidad que evaluar.",
            )
        )
        return ConfidenceReport(
            score=0.0,
            level="muy_baja",
            factors=factors,
            weakest="Existe un modelo que aporta información",
        )

    return ConfidenceReport(
        score=total,
        level=_level_for(total),
        factors=factors,
        weakest=weakest.label,
    )
