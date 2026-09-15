"""Métricas de probabilidad.

La precisión ("acertó / no acertó") es la métrica más engañosa que existe en
este problema: si el evento ocurre el 5% de las veces, decir siempre "no va a
pasar" acierta el 95% y no sirve de nada. Aquí lo que se mide es la calidad de
la *probabilidad*: Brier, log-loss, discriminación y calibración.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

EPS = 1e-12


def brier_score(y: np.ndarray, p: np.ndarray) -> float:
    return float(np.mean((p - y) ** 2))


def log_loss(y: np.ndarray, p: np.ndarray) -> float:
    clipped = np.clip(p, 1e-7, 1 - 1e-7)
    return float(-np.mean(y * np.log(clipped) + (1 - y) * np.log(1 - clipped)))


def roc_auc(y: np.ndarray, p: np.ndarray) -> float | None:
    """AUC por conteo de pares (maneja empates correctamente)."""
    positives, negatives = y == 1, y == 0
    n_pos, n_neg = int(positives.sum()), int(negatives.sum())
    if n_pos == 0 or n_neg == 0:
        return None
    order = np.argsort(p, kind="mergesort")
    ranks = np.empty(len(p), dtype=float)
    ranks[order] = np.arange(1, len(p) + 1, dtype=float)
    # Promediar rangos en los empates.
    sorted_p = p[order]
    i = 0
    while i < len(sorted_p):
        j = i
        while j + 1 < len(sorted_p) and sorted_p[j + 1] == sorted_p[i]:
            j += 1
        if j > i:
            ranks[order[i : j + 1]] = np.mean(ranks[order[i : j + 1]])
        i = j + 1
    rank_sum = ranks[positives].sum()
    return float((rank_sum - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def average_precision(y: np.ndarray, p: np.ndarray) -> float | None:
    """Área bajo la curva precisión-recall (PR-AUC)."""
    n_pos = int((y == 1).sum())
    if n_pos == 0:
        return None
    order = np.argsort(-p, kind="mergesort")
    y_sorted = y[order]
    true_positives = np.cumsum(y_sorted)
    precision = true_positives / np.arange(1, len(y_sorted) + 1)
    recall_gain = y_sorted / n_pos
    return float(np.sum(precision * recall_gain))


def calibration_bins(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> list[dict]:
    """Curva de calibración: probabilidad dicha vs. frecuencia observada."""
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    bins = []
    for i in range(n_bins):
        low, high = edges[i], edges[i + 1]
        mask = (p >= low) & (p < high) if i < n_bins - 1 else (p >= low) & (p <= high)
        count = int(mask.sum())
        if count == 0:
            continue
        bins.append(
            {
                "desde": float(low),
                "hasta": float(high),
                "n": count,
                "probabilidad_dicha": float(p[mask].mean()),
                "frecuencia_real": float(y[mask].mean()),
            }
        )
    return bins


def expected_calibration_error(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> float:
    bins = calibration_bins(y, p, n_bins)
    if not bins:
        return float("nan")
    total = sum(b["n"] for b in bins)
    return float(
        sum(b["n"] * abs(b["probabilidad_dicha"] - b["frecuencia_real"]) for b in bins) / total
    )


def maximum_calibration_error(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> float:
    bins = calibration_bins(y, p, n_bins)
    if not bins:
        return float("nan")
    return float(max(abs(b["probabilidad_dicha"] - b["frecuencia_real"]) for b in bins))


def calibration_slope(y: np.ndarray, p: np.ndarray) -> tuple[float | None, float | None]:
    """Pendiente y ordenada de y ~ logit(p).

    Pendiente 1 e intercepto 0 es calibración perfecta. Pendiente < 1 indica
    exceso de confianza (el modelo exagera).
    """
    if len(np.unique(y)) < 2:
        return None, None
    clipped = np.clip(p, 1e-6, 1 - 1e-6)
    logit = np.log(clipped / (1 - clipped))
    if np.std(logit) < 1e-9:
        return None, None
    from sklearn.linear_model import LogisticRegression

    try:
        model = LogisticRegression(C=1e6, solver="lbfgs", max_iter=1000)
        model.fit(logit.reshape(-1, 1), y)
        return float(model.coef_[0][0]), float(model.intercept_[0])
    except Exception:  # noqa: BLE001 - métrica opcional
        return None, None


def murphy_decomposition(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> dict:
    """Brier = fiabilidad − resolución + incertidumbre."""
    base = float(np.mean(y))
    uncertainty = base * (1 - base)
    bins = calibration_bins(y, p, n_bins)
    total = len(y)
    reliability = sum(
        b["n"] * (b["probabilidad_dicha"] - b["frecuencia_real"]) ** 2 for b in bins
    ) / max(total, 1)
    resolution = sum(b["n"] * (b["frecuencia_real"] - base) ** 2 for b in bins) / max(total, 1)
    return {
        "fiabilidad": float(reliability),
        "resolucion": float(resolution),
        "incertidumbre": float(uncertainty),
    }


@dataclass
class ProbabilityMetrics:
    """Todo lo que se puede decir con honestidad sobre un conjunto de predicciones."""

    n: int
    positives: int
    base_rate: float
    brier: float
    brier_skill: float
    logloss: float
    logloss_skill: float
    auc: float | None
    pr_auc: float | None
    pr_auc_lift: float | None
    ece: float
    mce: float
    calibration_slope: float | None
    calibration_intercept: float | None
    sharpness: float
    mean_probability: float
    decomposition: dict = field(default_factory=dict)
    bins: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "n": self.n,
            "eventos": self.positives,
            "tasa_base": round(self.base_rate, 6),
            "brier": round(self.brier, 6),
            "brier_skill": round(self.brier_skill, 6),
            "logloss": round(self.logloss, 6),
            "logloss_skill": round(self.logloss_skill, 6),
            "auc": round(self.auc, 4) if self.auc is not None else None,
            "pr_auc": round(self.pr_auc, 4) if self.pr_auc is not None else None,
            "pr_auc_lift": round(self.pr_auc_lift, 4) if self.pr_auc_lift is not None else None,
            "ece": round(self.ece, 5),
            "mce": round(self.mce, 5),
            "pendiente_calibracion": (
                round(self.calibration_slope, 4) if self.calibration_slope is not None else None
            ),
            "intercepto_calibracion": (
                round(self.calibration_intercept, 4)
                if self.calibration_intercept is not None
                else None
            ),
            "nitidez": round(self.sharpness, 5),
            "probabilidad_media": round(self.mean_probability, 5),
            "descomposicion": {k: round(v, 6) for k, v in self.decomposition.items()},
            "curva_calibracion": self.bins,
        }


def evaluate(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> ProbabilityMetrics:
    """Calcula todas las métricas contra la climatología como referencia."""
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    base = float(np.mean(y)) if len(y) else 0.0
    reference = np.full(len(y), base)

    brier = brier_score(y, p)
    brier_reference = brier_score(y, reference)
    logloss = log_loss(y, p)
    logloss_reference = log_loss(y, reference)
    pr = average_precision(y, p)

    return ProbabilityMetrics(
        n=int(len(y)),
        positives=int(y.sum()),
        base_rate=base,
        brier=brier,
        brier_skill=float(1 - brier / brier_reference) if brier_reference > EPS else 0.0,
        logloss=logloss,
        logloss_skill=float(1 - logloss / logloss_reference) if logloss_reference > EPS else 0.0,
        auc=roc_auc(y, p),
        pr_auc=pr,
        pr_auc_lift=float(pr / base) if (pr is not None and base > EPS) else None,
        ece=expected_calibration_error(y, p, n_bins),
        mce=maximum_calibration_error(y, p, n_bins),
        calibration_slope=calibration_slope(y, p)[0],
        calibration_intercept=calibration_slope(y, p)[1],
        sharpness=float(np.std(p)),
        mean_probability=float(np.mean(p)),
        decomposition=murphy_decomposition(y, p, n_bins),
        bins=calibration_bins(y, p, n_bins),
    )
