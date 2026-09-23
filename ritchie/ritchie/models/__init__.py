"""Catálogo de modelos candidatos de RITCHIE."""

from __future__ import annotations

from .base import Contribution, ProbabilisticModel, SeriesContext
from .baselines import BaseRateModel, EmpiricalBootstrapModel, RandomModel, RecentRateModel
from .bayes import BayesianAnalogModel
from .ensemble import EnsembleSpec, default_ensembles, disagreement
from .garch import GarchModel
from .ml import GradientBoostingModel, LogisticModel, RandomForestModel
from .timeseries import ArBootstrapModel, MarkovRegimeModel


def build_candidates(profile: str = "completo") -> list[ProbabilisticModel]:
    """Modelos que compiten. El perfil rápido recorta el costo, no el rigor."""
    fast = profile == "rapido"
    candidates: list[ProbabilisticModel] = [
        BaseRateModel(),
        RecentRateModel(),
        RandomModel(),
        EmpiricalBootstrapModel(),
        GarchModel(),
        ArBootstrapModel(order=3 if fast else 5),
        MarkovRegimeModel(max_iter=40 if fast else 80),
        BayesianAnalogModel(),
        LogisticModel(),
        RandomForestModel(n_estimators=100 if fast else 220, max_samples=0.6 if fast else 0.75),
        GradientBoostingModel(max_iter=100 if fast else 180),
    ]
    return candidates


__all__ = [
    "ProbabilisticModel",
    "SeriesContext",
    "Contribution",
    "BaseRateModel",
    "RecentRateModel",
    "RandomModel",
    "EmpiricalBootstrapModel",
    "GarchModel",
    "ArBootstrapModel",
    "MarkovRegimeModel",
    "BayesianAnalogModel",
    "LogisticModel",
    "RandomForestModel",
    "GradientBoostingModel",
    "EnsembleSpec",
    "default_ensembles",
    "disagreement",
    "build_candidates",
]
