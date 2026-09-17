"""RITCHIE — Robust Intelligent Time-series & Conditional Historical Estimation.

Sistema probabilístico de pronóstico y análisis de escenarios para activos
financieros.

Principio rector: no construir una máquina que le diga al usuario que tiene
razón, sino una capaz de demostrarle que está equivocado.
"""

from .config import ENGINE_FULL_NAME, ENGINE_NAME, ENGINE_VERSION, config_for_profile
from .features.targets import TargetSpec
from .nlq import parse as parse_question
from .pipeline import AnalysisResult, Ritchie

__version__ = ENGINE_VERSION
__all__ = [
    "Ritchie",
    "AnalysisResult",
    "TargetSpec",
    "parse_question",
    "config_for_profile",
    "ENGINE_NAME",
    "ENGINE_FULL_NAME",
    "ENGINE_VERSION",
]
