"""Combinación de modelos.

Las combinaciones están definidas de antemano (todos, estadísticos, machine
learning). No se arman "a posteriori" eligiendo a los ganadores, porque eso
sería hacer trampa: la combinación se mediría con los mismos datos que se
usaron para elegir a sus miembros. Aquí la combinación compite en igualdad de
condiciones con los modelos individuales y solo gana si de verdad gana.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

EPS = 1e-6


def to_logit(probabilities: np.ndarray) -> np.ndarray:
    clipped = np.clip(probabilities, EPS, 1 - EPS)
    return np.log(clipped / (1 - clipped))


def from_logit(values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-values))


@dataclass(frozen=True)
class EnsembleSpec:
    """Una receta fija de combinación."""

    name: str
    members: tuple[str, ...]
    method: str = "logit_mean"
    purpose: str = ""

    def combine(self, predictions: dict[str, np.ndarray]) -> np.ndarray | None:
        available = [predictions[m] for m in self.members if m in predictions]
        if len(available) < 2:
            return None
        stack = np.vstack(available)
        if self.method == "mean":
            return stack.mean(axis=0)
        if self.method == "median":
            return np.median(stack, axis=0)
        return from_logit(to_logit(stack).mean(axis=0))


def default_ensembles(model_names: list[str], families: dict[str, str]) -> list[EnsembleSpec]:
    """Recetas fijas a partir de los modelos realmente disponibles."""
    no_baseline = [n for n in model_names if families.get(n) != "baseline"]
    statistical = [n for n in model_names if families.get(n) == "estadistico"]
    learning = [n for n in model_names if families.get(n) == "machine_learning"]

    specs: list[EnsembleSpec] = []
    if len(no_baseline) >= 2:
        specs.append(
            EnsembleSpec(
                name="ensemble_todos",
                members=tuple(no_baseline),
                purpose="Promedio (en log-odds) de todos los modelos no triviales.",
            )
        )
        specs.append(
            EnsembleSpec(
                name="ensemble_mediana",
                members=tuple(no_baseline),
                method="median",
                purpose="Mediana de todos los modelos: resistente a un modelo desviado.",
            )
        )
    if len(statistical) >= 2:
        specs.append(
            EnsembleSpec(
                name="ensemble_estadistico",
                members=tuple(statistical),
                purpose="Promedio de los modelos estadísticos.",
            )
        )
    if len(learning) >= 2:
        specs.append(
            EnsembleSpec(
                name="ensemble_ml",
                members=tuple(learning),
                purpose="Promedio de los modelos de machine learning.",
            )
        )
    return specs


def disagreement(predictions: dict[str, np.ndarray], members: list[str]) -> np.ndarray:
    """Desviación estándar entre modelos: cuánto se contradicen."""
    available = [predictions[m] for m in members if m in predictions]
    if len(available) < 2:
        return np.zeros(len(next(iter(predictions.values()))))
    return np.vstack(available).std(axis=0)
