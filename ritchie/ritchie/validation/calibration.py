"""Calibración de probabilidades.

Un modelo puede ordenar bien los casos (buen AUC) y aun así mentir en la
magnitud: decir 80% cuando en realidad pasa el 40% de las veces. La
calibración corrige esa magnitud usando exclusivamente predicciones fuera de
muestra anteriores al periodo evaluado.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

from .metrics import brier_score, expected_calibration_error

#: Mínimo de observaciones y eventos para intentar calibrar.
MIN_SAMPLES = 150
MIN_EVENTS = 12


class Calibrator(ABC):
    name = "identidad"

    @abstractmethod
    def fit(self, p: np.ndarray, y: np.ndarray) -> "Calibrator": ...

    @abstractmethod
    def transform(self, p: np.ndarray) -> np.ndarray: ...

    def info(self) -> dict:
        return {"metodo": self.name}


class IdentityCalibrator(Calibrator):
    """No tocar nada. Es lo correcto cuando el modelo ya está calibrado."""

    name = "sin_ajuste"

    def fit(self, p: np.ndarray, y: np.ndarray) -> "IdentityCalibrator":
        return self

    def transform(self, p: np.ndarray) -> np.ndarray:
        return np.asarray(p, dtype=float)


class PlattCalibrator(Calibrator):
    """Ajuste sigmoide de un parámetro de pendiente y uno de sesgo."""

    name = "platt"

    def __init__(self) -> None:
        self.model: LogisticRegression | None = None

    def fit(self, p: np.ndarray, y: np.ndarray) -> "PlattCalibrator":
        logit = np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
        self.model = LogisticRegression(C=1e6, solver="lbfgs", max_iter=1000)
        self.model.fit(logit.reshape(-1, 1), y)
        return self

    def transform(self, p: np.ndarray) -> np.ndarray:
        if self.model is None:
            return np.asarray(p, dtype=float)
        logit = np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
        return self.model.predict_proba(logit.reshape(-1, 1))[:, 1]


class IsotonicCalibrator(Calibrator):
    """Ajuste monótono no paramétrico. Flexible pero necesita más datos."""

    name = "isotonica"

    def __init__(self) -> None:
        self.model: IsotonicRegression | None = None

    def fit(self, p: np.ndarray, y: np.ndarray) -> "IsotonicCalibrator":
        self.model = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        self.model.fit(p, y)
        return self

    def transform(self, p: np.ndarray) -> np.ndarray:
        if self.model is None:
            return np.asarray(p, dtype=float)
        return np.clip(self.model.predict(p), 1e-4, 1 - 1e-4)


def _split_halves(n: int) -> tuple[slice, slice]:
    """Partición temporal en dos mitades (la primera entrena el calibrador)."""
    middle = n // 2
    return slice(0, middle), slice(middle, n)


def choose_calibrator(p: np.ndarray, y: np.ndarray, seed: int = 0) -> tuple[Calibrator, dict]:
    """Elige entre no calibrar, Platt o isotónica, con validación temporal.

    El criterio no es "cuál ajusta mejor lo que ya vio" sino cuál mejora el
    Brier en la segunda mitad del periodo, habiendo aprendido solo en la
    primera. Si ninguno mejora, no se calibra: tocar por tocar empeora.
    """
    p = np.asarray(p, dtype=float)
    y = np.asarray(y, dtype=float)
    report: dict = {"candidatos": {}}

    if len(p) < MIN_SAMPLES or y.sum() < MIN_EVENTS or len(np.unique(y)) < 2:
        report["decision"] = "sin_ajuste"
        report["motivo"] = "muestra fuera de muestra insuficiente para calibrar con seguridad"
        return IdentityCalibrator(), report

    first, second = _split_halves(len(p))
    if y[first].sum() < 5 or y[second].sum() < 5:
        report["decision"] = "sin_ajuste"
        report["motivo"] = "muy pocos eventos en alguna mitad del periodo de calibración"
        return IdentityCalibrator(), report

    candidates: list[Calibrator] = [IdentityCalibrator(), PlattCalibrator()]
    if len(p) >= 400 and y.sum() >= 40:
        candidates.append(IsotonicCalibrator())

    best_name, best_score, best_class = "sin_ajuste", np.inf, IdentityCalibrator
    for candidate in candidates:
        try:
            fitted = candidate.fit(p[first], y[first])
            adjusted = fitted.transform(p[second])
            score = brier_score(y[second], adjusted)
            report["candidatos"][candidate.name] = {
                "brier_validacion": round(float(score), 6),
                "ece_validacion": round(float(expected_calibration_error(y[second], adjusted)), 5),
            }
            if score < best_score - 1e-9:
                best_score, best_name, best_class = score, candidate.name, type(candidate)
        except Exception as exc:  # noqa: BLE001 - un calibrador que falla se descarta
            report["candidatos"][candidate.name] = {"error": str(exc)}

    report["decision"] = best_name
    # El elegido se reajusta con todo el periodo disponible.
    final = best_class()
    try:
        final.fit(p, y)
    except Exception:  # noqa: BLE001
        report["decision"] = "sin_ajuste"
        return IdentityCalibrator(), report
    return final, report
