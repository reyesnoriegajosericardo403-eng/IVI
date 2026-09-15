"""Competencia y selección adaptativa de modelos.

El modelo que gana no es el que más "acierta". Es el que produce
probabilidades honestas y estables fuera de muestra. Un modelo que dice 90% y
acierta el 60% de las veces es peor que uno que dice 60% y acierta el 60%,
aunque el primero tenga mejor precisión.

Protocolo:

1. Todo se mide sobre predicciones fuera de muestra del walk-forward.
2. La **selección** usa solo el tramo de desarrollo.
3. El tramo final de prueba no participa en ninguna decisión: se usa una sola
   vez, al final, para reportar qué tan bien se sostiene lo elegido.
4. Como se comparan muchos candidatos, la significancia se corrige por
   pruebas múltiples (Benjamini-Hochberg).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..config import DecisionConfig
from ..models.ensemble import EnsembleSpec, default_ensembles
from ..statistics.tests import benjamini_hochberg, paired_brier_test, reality_check
from .calibration import Calibrator, IdentityCalibrator, choose_calibrator
from .metrics import ProbabilityMetrics, evaluate

#: Pesos del puntaje compuesto. La calidad de la probabilidad pesa más que
#: la capacidad de ordenar, y la estabilidad pesa más que un pico afortunado.
WEIGHTS = {"habilidad": 0.40, "calibracion": 0.25, "discriminacion": 0.15, "estabilidad": 0.20}

#: Segmentos en que se parte el periodo de desarrollo para medir estabilidad.
STABILITY_SEGMENTS = 6


@dataclass
class ModelScore:
    name: str
    family: str
    dev: ProbabilityMetrics
    composite: float
    stability: float
    segment_skills: list[float]
    significance: dict
    is_baseline: bool = False
    purpose: str = ""

    def to_dict(self) -> dict:
        return {
            "modelo": self.name,
            "familia": self.family,
            "proposito": self.purpose,
            "es_referencia": self.is_baseline,
            "puntaje": round(self.composite, 5),
            "estabilidad": round(self.stability, 4),
            "habilidad_por_segmento": [round(s, 5) for s in self.segment_skills],
            "metricas_desarrollo": self.dev.to_dict(),
            "significancia": self.significance,
        }


@dataclass
class SelectionResult:
    ranking: list[ModelScore]
    selected: str | None
    calibrator: Calibrator
    calibration_report: dict = field(default_factory=dict)
    test_metrics: ProbabilityMetrics | None = None
    dev_metrics_calibrated: ProbabilityMetrics | None = None
    rejection_reasons: list[str] = field(default_factory=list)
    ensembles: list[EnsembleSpec] = field(default_factory=list)
    predictions: pd.DataFrame | None = None
    reality: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "modelo_elegido": self.selected,
            "calibracion": self.calibration_report,
            "prueba_de_realidad": self.reality,
            "tabla_de_competencia": [s.to_dict() for s in self.ranking],
            "metricas_prueba_final": self.test_metrics.to_dict() if self.test_metrics else None,
            "metricas_desarrollo_calibradas": (
                self.dev_metrics_calibrated.to_dict() if self.dev_metrics_calibrated else None
            ),
            "motivos_de_rechazo": list(self.rejection_reasons),
        }


def _segment_skills(y: np.ndarray, p: np.ndarray, segments: int = STABILITY_SEGMENTS) -> list[float]:
    """Habilidad de Brier en tramos consecutivos: detecta el modelo de un solo golpe."""
    n = len(y)
    if n < segments * 25:
        segments = max(2, n // 40)
    if segments < 2:
        return []
    bounds = np.linspace(0, n, segments + 1).astype(int)
    skills: list[float] = []
    for i in range(segments):
        lo, hi = bounds[i], bounds[i + 1]
        if hi - lo < 15:
            continue
        chunk_y, chunk_p = y[lo:hi], p[lo:hi]
        base = float(chunk_y.mean())
        reference = float(np.mean((base - chunk_y) ** 2))
        model = float(np.mean((chunk_p - chunk_y) ** 2))
        skills.append(float(1 - model / reference) if reference > 1e-12 else 0.0)
    return skills


def _composite(metrics: ProbabilityMetrics, stability: float, decision: DecisionConfig) -> float:
    skill = float(np.clip(metrics.brier_skill, -0.10, 0.10)) / 0.10
    calibration_penalty = min(metrics.ece / max(decision.max_calibration_error, 1e-6), 2.0) / 2.0
    calibration = 1.0 - calibration_penalty
    if metrics.auc is None:
        discrimination = 0.0
    else:
        discrimination = float(np.clip(2 * (metrics.auc - 0.5), 0.0, 1.0))
    return float(
        WEIGHTS["habilidad"] * skill
        + WEIGHTS["calibracion"] * calibration
        + WEIGHTS["discriminacion"] * discrimination
        + WEIGHTS["estabilidad"] * stability
    )


def add_ensembles(
    predictions: pd.DataFrame, families: dict[str, str]
) -> tuple[pd.DataFrame, list[EnsembleSpec]]:
    """Agrega las combinaciones fijas como columnas más de la competencia."""
    specs = default_ensembles(list(predictions.columns), families)
    enriched = predictions.copy()
    used: list[EnsembleSpec] = []
    as_arrays = {c: predictions[c].to_numpy(dtype=float) for c in predictions.columns}
    for spec in specs:
        combined = spec.combine(as_arrays)
        if combined is None:
            continue
        enriched[spec.name] = combined
        used.append(spec)
    return enriched, used


def select_model(
    predictions: pd.DataFrame,
    y: pd.Series,
    dev_mask: np.ndarray,
    families: dict[str, str],
    purposes: dict[str, str],
    decision: DecisionConfig,
    seed: int = 0,
    horizon: int = 1,
) -> SelectionResult:
    """Compara todos los candidatos y elige, o declara que ninguno sirve."""
    enriched, ensembles = add_ensembles(predictions, families)
    for spec in ensembles:
        families[spec.name] = "ensemble"
        purposes[spec.name] = spec.purpose

    y_values = y.to_numpy(dtype=float)
    dev_y = y_values[dev_mask]
    test_y = y_values[~dev_mask]
    base_rate_dev = float(dev_y.mean()) if len(dev_y) else 0.0
    reference = np.full(len(dev_y), base_rate_dev)
    block = max(10, horizon * 3)

    scores: list[ModelScore] = []
    p_values: list[float] = []
    for name in enriched.columns:
        column = enriched[name].to_numpy(dtype=float)
        dev_p = column[dev_mask]
        if np.isnan(dev_p).any() or len(dev_p) < 40:
            continue
        metrics = evaluate(dev_y, dev_p)
        skills = _segment_skills(dev_y, dev_p)
        stability = float(np.mean([s > 0 for s in skills])) if skills else 0.0
        test = paired_brier_test(dev_y, dev_p, reference, block=block, n_boot=1200, seed=seed)
        p_values.append(test.p_value)
        scores.append(
            ModelScore(
                name=name,
                family=families.get(name, "otros"),
                purpose=purposes.get(name, ""),
                dev=metrics,
                composite=_composite(metrics, stability, decision),
                stability=stability,
                segment_skills=skills,
                significance=test.to_dict(),
                is_baseline=families.get(name) == "baseline",
            )
        )

    # Corrección por probar muchos modelos a la vez.
    #
    # Se reportan dos correcciones. Benjamini-Hochberg es informativa: trata a
    # los candidatos como si fueran independientes, cosa que no son (los
    # ensembles contienen a los individuales), así que castiga de más. La que
    # decide es la prueba de realidad de White, que remuestrea el tiempo una
    # sola vez por réplica para todos los modelos a la vez y responde
    # directamente: "¿pudo el azar producir un ganador así de bueno?".
    decisions = benjamini_hochberg(p_values, alpha=0.10)
    for score, passed in zip(scores, decisions):
        score.significance["significativo_benjamini_hochberg"] = bool(passed)

    # Solo compiten los candidatos de verdad: las referencias (tasa base, azar,
    # bootstrap simple) son la vara de medir, no participantes.
    candidate_predictions = {
        score.name: enriched[score.name].to_numpy(dtype=float)[dev_mask]
        for score in scores
        if not score.is_baseline
    }
    reality = reality_check(
        dev_y, candidate_predictions, reference, block=block, n_boot=2000, seed=seed
    )
    for score in scores:
        score.significance["p_valor_individual"] = round(
            float(reality["individuales"].get(score.name, 1.0)), 5
        )

    scores.sort(key=lambda s: s.composite, reverse=True)

    reasons: list[str] = []
    selected: str | None = None
    competition_is_real = reality["p_valor"] < 0.05
    if not competition_is_real:
        reasons.append(
            "Prueba de realidad: la ventaja del mejor modelo es compatible con el azar "
            f"(p={reality['p_valor']:.3f} comparando {reality['modelos_comparados']} candidatos). "
            "Ningún modelo demostró aportar información."
        )

    for score in scores:
        if score.is_baseline:
            continue
        if score.dev.n < decision.min_oos_predictions:
            reasons.append(
                f"{score.name}: solo {score.dev.n} predicciones fuera de muestra "
                f"(se exigen {decision.min_oos_predictions})."
            )
            continue
        if score.dev.positives < decision.min_positive_events:
            reasons.append(
                f"{score.name}: solo {score.dev.positives} ocurrencias del evento en la validación."
            )
            continue
        if score.dev.brier_skill < decision.min_brier_skill:
            reasons.append(
                f"{score.name}: no mejora la tasa base (habilidad {score.dev.brier_skill:+.4f})."
            )
            continue
        if not competition_is_real:
            continue
        if score.significance.get("p_valor_individual", 1.0) >= 0.10:
            reasons.append(
                f"{score.name}: su ventaja individual no se distingue del azar "
                f"(p={score.significance['p_valor_individual']:.3f})."
            )
            continue
        if score.dev.ece > decision.max_calibration_error:
            reasons.append(
                f"{score.name}: sus probabilidades están mal calibradas (error {score.dev.ece:.3f})."
            )
            continue
        selected = score.name
        break

    calibrator: Calibrator = IdentityCalibrator()
    calibration_report: dict = {}
    test_metrics = None
    dev_calibrated = None
    if selected is not None:
        column = enriched[selected].to_numpy(dtype=float)
        calibrator, calibration_report = choose_calibrator(column[dev_mask], dev_y, seed=seed)
        dev_calibrated = evaluate(dev_y, calibrator.transform(column[dev_mask]))
        if len(test_y) >= 20:
            test_metrics = evaluate(test_y, calibrator.transform(column[~dev_mask]))

    return SelectionResult(
        ranking=scores,
        selected=selected,
        calibrator=calibrator,
        calibration_report=calibration_report,
        test_metrics=test_metrics,
        dev_metrics_calibrated=dev_calibrated,
        rejection_reasons=reasons,
        ensembles=ensembles,
        predictions=enriched,
        reality=reality,
    )
