"""Configuración central, versiones y semillas de RITCHIE.

Todo lo que afecta un resultado vive aquí para que un análisis sea
reproducible: semilla, versión del motor, umbrales de decisión y
parámetros de validación.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field, asdict
from typing import Any

ENGINE_VERSION = "1.0.0"
ENGINE_NAME = "RITCHIE"
ENGINE_FULL_NAME = "Robust Intelligent Time-series & Conditional Historical Estimation"

#: Semilla global. Cualquier proceso estocástico del motor deriva de aquí.
DEFAULT_SEED = 20240517

#: Horizontes soportados, en sesiones de mercado.
SUPPORTED_HORIZONS = (1, 2, 3, 5, 10, 20)

#: Días naturales de historia que se piden por defecto a la fuente de datos.
DEFAULT_HISTORY_DAYS = 365 * 12


@dataclass(frozen=True)
class ValidationConfig:
    """Parámetros de la validación temporal."""

    #: Observaciones mínimas de entrenamiento antes de la primera predicción.
    min_train: int = 500
    #: Cada cuántas sesiones se reentrena (se predice en todas).
    refit_every: int = 21
    #: Fracción final de la muestra reservada como prueba jamás vista.
    final_test_fraction: float = 0.2
    #: Observaciones mínimas exigidas al tramo de prueba final.
    min_final_test: int = 120
    #: Se descartan del entrenamiento las filas cuyo objetivo se solapa
    #: con el periodo de prueba (purga = horizonte - 1) más este colchón.
    embargo: int = 1


@dataclass(frozen=True)
class DecisionConfig:
    """Umbrales que deciden si hay señal y con cuánta confianza."""

    #: Observaciones totales mínimas para siquiera intentar modelar.
    min_observations: int = 750
    #: Predicciones fuera de muestra mínimas para evaluar un modelo.
    min_oos_predictions: int = 150
    #: Eventos positivos mínimos fuera de muestra (evita AUC de ruido).
    min_positive_events: int = 15
    #: Error de calibración esperado máximo tolerable.
    max_calibration_error: float = 0.10
    #: Mejora mínima de Brier sobre la tasa base para hablar de habilidad.
    min_brier_skill: float = 0.005
    #: Desacuerdo máximo entre modelos (desviación estándar de sus
    #: probabilidades) antes de declarar que los modelos no coinciden.
    max_model_disagreement: float = 0.18
    #: Distancia máxima al vecindario histórico para considerar el
    #: régimen actual "conocido" (percentil de distancias históricas).
    max_regime_novelty: float = 0.98
    #: Calidad de datos mínima (0-1) para emitir señal.
    min_data_quality: float = 0.85
    #: Diferencia mínima frente a la tasa base para que la respuesta
    #: aporte información y no sea un eco del promedio histórico.
    min_edge_vs_base_rate: float = 0.03


@dataclass(frozen=True)
class SimulationConfig:
    """Parámetros del motor de escenarios."""

    n_paths: int = 20000
    block_size: int = 5
    student_t_df: float = 5.0


@dataclass(frozen=True)
class BacktestConfig:
    """Supuestos de costos del backtest."""

    #: Comisión por lado, en fracción del nocional.
    commission: float = 0.0005
    #: Deslizamiento por lado, en fracción del precio.
    slippage: float = 0.0010
    #: Umbral de probabilidad para tomar posición.
    entry_probability: float = 0.55


@dataclass(frozen=True)
class RitchieConfig:
    seed: int = DEFAULT_SEED
    validation: ValidationConfig = field(default_factory=ValidationConfig)
    decision: DecisionConfig = field(default_factory=DecisionConfig)
    simulation: SimulationConfig = field(default_factory=SimulationConfig)
    backtest: BacktestConfig = field(default_factory=BacktestConfig)
    #: Perfil de cómputo: "rapido" reduce remuestreos y árboles.
    profile: str = "completo"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def cache_dir() -> str:
    """Directorio de caché de datos de mercado (configurable por entorno)."""
    path = os.environ.get(
        "RITCHIE_CACHE_DIR",
        os.path.join(os.path.expanduser("~"), ".cache", "ritchie"),
    )
    os.makedirs(path, exist_ok=True)
    return path


#: Perfiles de cómputo. "rapido" reentrena con menos frecuencia y usa menos
#: árboles y caminos: responde en segundos con el mismo protocolo de
#: validación. "completo" es el que se usa para auditar de verdad.
PROFILES = ("rapido", "completo", "exhaustivo")


def validation_for_profile(profile: str) -> ValidationConfig:
    if profile == "rapido":
        return ValidationConfig(min_train=500, refit_every=42)
    if profile == "exhaustivo":
        return ValidationConfig(min_train=500, refit_every=10)
    return ValidationConfig(min_train=500, refit_every=21)


def simulation_for_profile(profile: str) -> SimulationConfig:
    if profile == "rapido":
        return SimulationConfig(n_paths=10000)
    if profile == "exhaustivo":
        return SimulationConfig(n_paths=50000)
    return SimulationConfig()


def paths_for_evaluation(profile: str) -> int:
    """Caminos simulados durante la validación (no en la respuesta final)."""
    return {"rapido": 400, "completo": 800, "exhaustivo": 1500}.get(profile, 800)


def config_for_profile(profile: str = "completo", seed: int = DEFAULT_SEED) -> RitchieConfig:
    return RitchieConfig(
        seed=seed,
        validation=validation_for_profile(profile),
        simulation=simulation_for_profile(profile),
        profile=profile,
    )


DEFAULT_CONFIG = RitchieConfig()
