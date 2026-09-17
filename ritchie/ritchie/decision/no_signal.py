"""Sistema de "no hay señal".

La función más importante del sistema. Es fácil construir algo que siempre
tenga una opinión; lo difícil —y lo útil— es construir algo capaz de decir
"con estos datos no puedo responderte con honestidad".

Cada bloqueo trae el motivo exacto y qué haría falta para levantarlo.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from ..config import DecisionConfig

MESSAGE = "No hay suficiente evidencia para generar una señal confiable."


@dataclass
class Blocker:
    key: str
    reason: str
    detail: str
    remedy: str = ""

    def to_dict(self) -> dict:
        return {"clave": self.key, "motivo": self.reason, "detalle": self.detail, "remedio": self.remedy}


@dataclass
class SignalDecision:
    has_signal: bool
    blockers: list[Blocker] = field(default_factory=list)
    message: str = ""

    def to_dict(self) -> dict:
        return {
            "hay_senal": self.has_signal,
            "mensaje": self.message,
            "bloqueos": [b.to_dict() for b in self.blockers],
        }


def evaluate_signal(
    *,
    n_observations: int,
    n_oos: int,
    n_events: int,
    selected_model: str | None,
    rejection_reasons: list[str],
    calibration_ece: float | None,
    model_spread: float | None,
    novelty_percentile: float | None,
    data_quality: float,
    data_issues: list[str],
    probability: float | None,
    base_rate: float | None,
    is_synthetic: bool,
    decision: DecisionConfig,
) -> SignalDecision:
    """Aplica todas las reglas de bloqueo y devuelve el veredicto."""
    blockers: list[Blocker] = []

    if is_synthetic:
        blockers.append(
            Blocker(
                "datos_simulados",
                "La serie analizada es simulada, no es mercado real",
                "Ninguna conclusión de esta corrida describe un activo real.",
                "Conectar una fuente de datos real (Yahoo Finance, CSV del bróker).",
            )
        )

    if n_observations < decision.min_observations:
        blockers.append(
            Blocker(
                "datos_insuficientes",
                "Historia insuficiente",
                f"Hay {n_observations} sesiones utilizables y se necesitan al menos "
                f"{decision.min_observations}.",
                "Elegir un activo con más historia o un horizonte más corto.",
            )
        )

    if n_oos < decision.min_oos_predictions:
        blockers.append(
            Blocker(
                "validacion_insuficiente",
                "Muy pocas predicciones fuera de muestra",
                f"Solo se pudieron validar {n_oos} predicciones "
                f"(mínimo {decision.min_oos_predictions}).",
                "Más historia permitiría validar mejor.",
            )
        )

    if n_events < decision.min_positive_events:
        blockers.append(
            Blocker(
                "eventos_insuficientes",
                "El evento casi no ocurrió en la historia",
                f"Solo {n_events} ocurrencias reales en la validación "
                f"(mínimo {decision.min_positive_events}). Con tan pocos casos, cualquier "
                "probabilidad sería una opinión disfrazada de número.",
                "Pedir un movimiento más pequeño o un horizonte más largo.",
            )
        )

    if selected_model is None:
        detail = (
            "Ningún modelo superó a la simple frecuencia histórica de forma estadísticamente "
            "sostenible."
        )
        if rejection_reasons:
            detail += " Motivos: " + " ".join(rejection_reasons[:3])
        blockers.append(
            Blocker(
                "sin_modelo_util",
                "Ningún modelo demostró aportar información",
                detail,
                "La tasa base histórica sigue siendo la mejor estimación disponible.",
            )
        )

    if calibration_ece is not None and np.isfinite(calibration_ece):
        if calibration_ece > decision.max_calibration_error:
            blockers.append(
                Blocker(
                    "calibracion_pobre",
                    "Las probabilidades no son fiables en magnitud",
                    f"Error de calibración {calibration_ece:.1%}, por encima del máximo "
                    f"tolerado ({decision.max_calibration_error:.0%}).",
                    "Se necesitan más datos o un modelo distinto para este activo.",
                )
            )

    if model_spread is not None and model_spread > decision.max_model_disagreement:
        blockers.append(
            Blocker(
                "modelos_en_desacuerdo",
                "Los modelos no coinciden",
                f"Sus probabilidades se separan {model_spread:.1%}, por encima del máximo "
                f"tolerado ({decision.max_model_disagreement:.0%}).",
                "Cuando los métodos se contradicen, lo honesto es no elegir uno a conveniencia.",
            )
        )

    if novelty_percentile is not None and novelty_percentile > decision.max_regime_novelty:
        blockers.append(
            Blocker(
                "regimen_inusual",
                "El momento actual no se parece a nada del pasado",
                f"El estado de hoy es más extremo que el {novelty_percentile:.0%} de su historia. "
                "Los modelos estarían extrapolando.",
                "Esperar a que el activo vuelva a un terreno conocido.",
            )
        )

    if data_quality < decision.min_data_quality:
        blockers.append(
            Blocker(
                "calidad_de_datos",
                "Problemas en los datos",
                f"Calidad {data_quality:.0%} (mínimo {decision.min_data_quality:.0%}). "
                + " ".join(data_issues[:3]),
                "Usar otra fuente o corregir la serie antes de modelar.",
            )
        )

    if probability is not None and base_rate is not None:
        edge = abs(probability - base_rate)
        if edge < decision.min_edge_vs_base_rate and not blockers:
            blockers.append(
                Blocker(
                    "sin_ventaja",
                    "La estimación no aporta nada sobre el promedio histórico",
                    f"El modelo dice {probability:.1%} y la frecuencia histórica es "
                    f"{base_rate:.1%}: la diferencia ({edge:.1%}) es demasiado pequeña "
                    "para ser accionable.",
                    "No es un error del modelo: es que hoy no hay información especial.",
                )
            )

    has_signal = len(blockers) == 0
    return SignalDecision(
        has_signal=has_signal,
        blockers=blockers,
        message="" if has_signal else MESSAGE,
    )
