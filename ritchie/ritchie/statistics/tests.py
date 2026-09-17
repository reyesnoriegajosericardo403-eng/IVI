"""Pruebas estadísticas para decidir si un patrón es real o es suerte.

El problema central de este campo: con suficientes intentos siempre aparece
algo que "funcionó". Estas herramientas existen para distinguir una ventaja
real de una casualidad bien vestida.

Todo lo que mide series temporales usa **bootstrap por bloques**: remuestrear
día por día destruiría la autocorrelación y regalaría intervalos de confianza
artificialmente angostos.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats


@dataclass
class TestResult:
    """Resultado de una prueba, con su tamaño de efecto y su lectura llana."""

    name: str
    statistic: float
    p_value: float
    effect_size: float | None = None
    ci_low: float | None = None
    ci_high: float | None = None
    n: int = 0
    detail: str = ""

    @property
    def significant(self) -> bool:
        return self.p_value < 0.05

    def to_dict(self) -> dict:
        return {
            "prueba": self.name,
            "estadistico": round(float(self.statistic), 6),
            "p_valor": round(float(self.p_value), 6),
            "tamano_efecto": round(float(self.effect_size), 6) if self.effect_size is not None else None,
            "ic_95": (
                [round(float(self.ci_low), 6), round(float(self.ci_high), 6)]
                if self.ci_low is not None
                else None
            ),
            "n": int(self.n),
            "significativo": bool(self.significant),
            "detalle": self.detail,
        }


# --------------------------------------------------------------- bootstrap
def block_indices(n: int, block: int, rng: np.random.Generator, size: int | None = None) -> np.ndarray:
    """Índices de un bootstrap por bloques móviles."""
    size = size or n
    n_blocks = int(np.ceil(size / block))
    starts = rng.integers(0, max(1, n - block + 1), size=n_blocks)
    offsets = np.arange(block)
    return (starts[:, None] + offsets).ravel()[:size] % n


def block_bootstrap_means(
    values: np.ndarray, n_boot: int, block: int, rng: np.random.Generator
) -> np.ndarray:
    """Medias de `n_boot` remuestreos por bloques, todas de un golpe.

    Vectorizado a propósito: la versión con bucle domina el tiempo total del
    análisis cuando se comparan quince modelos.
    """
    n = values.size
    block = max(1, min(block, n))
    n_blocks = int(np.ceil(n / block))
    starts = rng.integers(0, max(1, n - block + 1), size=(n_boot, n_blocks))
    offsets = np.arange(block)
    indices = (starts[:, :, None] + offsets).reshape(n_boot, -1)[:, :n] % n
    return values[indices].mean(axis=1)


def block_bootstrap_ci(
    values: np.ndarray,
    n_boot: int = 2000,
    block: int = 10,
    alpha: float = 0.05,
    seed: int = 0,
) -> tuple[float, float, float]:
    """Media e intervalo de confianza de una serie autocorrelacionada."""
    values = np.asarray(values, dtype=float)
    n = values.size
    if n == 0:
        return float("nan"), float("nan"), float("nan")
    rng = np.random.default_rng(seed)
    means = block_bootstrap_means(values, n_boot, block, rng)
    low, high = np.percentile(means, [100 * alpha / 2, 100 * (1 - alpha / 2)])
    return float(values.mean()), float(low), float(high)


def paired_brier_test(
    y: np.ndarray,
    p_model: np.ndarray,
    p_reference: np.ndarray,
    block: int = 10,
    n_boot: int = 2000,
    seed: int = 0,
) -> TestResult:
    """¿El modelo mejora el Brier de la referencia más allá del azar?

    Se compara la diferencia día a día (pérdida de la referencia menos pérdida
    del modelo) con bootstrap por bloques. Positivo = el modelo es mejor.
    """
    y = np.asarray(y, dtype=float)
    differences = (p_reference - y) ** 2 - (p_model - y) ** 2
    rng = np.random.default_rng(seed)
    means = block_bootstrap_means(differences, n_boot, max(1, min(block, differences.size)), rng)
    mean = float(differences.mean())
    low, high = (float(v) for v in np.percentile(means, [2.5, 97.5]))
    # p-valor de una cola: proporción de remuestreos donde el modelo no mejora.
    p_value = float((np.sum(means <= 0) + 1) / (n_boot + 1))
    reference_brier = float(np.mean((p_reference - y) ** 2))
    skill = mean / reference_brier if reference_brier > 1e-12 else 0.0
    return TestResult(
        name="brier_pareado_bootstrap_bloques",
        statistic=float(mean),
        p_value=float(p_value),
        effect_size=float(skill),
        ci_low=low,
        ci_high=high,
        n=int(differences.size),
        detail="Mejora media del Brier frente a la referencia (positivo = el modelo aporta).",
    )


def reality_check(
    y: np.ndarray,
    candidates: dict[str, np.ndarray],
    reference: np.ndarray,
    block: int = 10,
    n_boot: int = 2000,
    seed: int = 0,
) -> dict:
    """Prueba de realidad estudentizada (White / Hansen) para el mejor modelo.

    El problema: si se comparan quince modelos contra la tasa base, el mejor de
    ellos se ve bien aunque ninguno sirva — igual que el más alto de quince
    personas al azar parece alto. Benjamini-Hochberg castiga de más aquí,
    porque los candidatos están fuertemente correlacionados (los ensembles
    contienen a los individuales).

    La solución correcta: remuestrear el tiempo **una sola vez por réplica** y
    aplicarlo a todos los modelos a la vez, para obtener la distribución del
    máximo bajo la hipótesis de que ninguno aporta nada.

    Dos detalles que deciden si la prueba sirve o no:

    * **Estudentizar.** Sin dividir entre la incertidumbre de cada modelo, el
      máximo lo domina el modelo más ruidoso y la prueba pierde todo su poder.
    * **Descartar a los desahuciados.** Un modelo claramente peor que la
      referencia no puede ser el ganador; dejarlo dentro solo aporta ruido al
      máximo (es la corrección de Hansen).

    Devuelve el p-valor conjunto, el mejor candidato y el p-valor individual de
    cada uno (informativo, sin corregir).
    """
    y = np.asarray(y, dtype=float)
    names = list(candidates)
    if not names:
        return {"p_valor": 1.0, "mejor": None, "individuales": {}, "modelos_comparados": 0}

    reference_loss = (reference - y) ** 2
    differentials = np.vstack(
        [reference_loss - (np.asarray(candidates[name], dtype=float) - y) ** 2 for name in names]
    )
    observed = differentials.mean(axis=1)

    n = differentials.shape[1]
    block = max(1, min(block, n))
    rng = np.random.default_rng(seed)
    n_blocks = int(np.ceil(n / block))
    offsets = np.arange(block)

    # Se remuestrea por tandas: la matriz completa (modelos × réplicas × días)
    # llegaría a cientos de megabytes sin ninguna necesidad.
    resampled = np.empty((len(names), n_boot))
    chunk = max(1, min(n_boot, int(4e7 / max(len(names) * n, 1))))
    for start in range(0, n_boot, chunk):
        size = min(chunk, n_boot - start)
        starts = rng.integers(0, max(1, n - block + 1), size=(size, n_blocks))
        indices = (starts[:, :, None] + offsets).reshape(size, -1)[:, :n] % n
        resampled[:, start : start + size] = differentials[:, indices].mean(axis=2)
    omega = resampled.std(axis=1, ddof=1)
    omega = np.where(omega > 1e-12, omega, 1e-12)

    studentized = observed / omega
    centered = (resampled - observed[:, None]) / omega[:, None]

    # Modelos claramente peores que la referencia no compiten por el máximo.
    alive = observed > -omega
    if not alive.any():
        alive = np.ones(len(names), dtype=bool)

    statistic = float(studentized[alive].max())
    maxima = centered[alive].max(axis=0)
    p_value = float((np.sum(maxima >= statistic) + 1) / (n_boot + 1))
    best_index = int(np.argmax(np.where(alive, studentized, -np.inf)))

    individual = {
        name: float((np.sum(centered[i] >= studentized[i]) + 1) / (n_boot + 1))
        for i, name in enumerate(names)
    }
    return {
        "p_valor": p_value,
        "mejor": names[best_index],
        "mejora_del_mejor": float(observed[best_index]),
        "estadistico_estudentizado": statistic,
        "individuales": individual,
        "modelos_en_competencia": int(alive.sum()),
        "modelos_comparados": len(names),
        "n": int(n),
        "detalle": (
            "Probabilidad de que el azar produjera un ganador tan bueno como el mejor de los "
            f"{int(alive.sum())} modelos que siguen en competencia."
        ),
    }


def permutation_auc_test(
    y: np.ndarray, p: np.ndarray, n_permutations: int = 2000, seed: int = 0
) -> TestResult:
    """¿La capacidad de ordenar casos sobrevive a barajar las etiquetas?"""
    from ..validation.metrics import roc_auc

    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    observed = roc_auc(y, p)
    if observed is None:
        return TestResult("permutacion_auc", float("nan"), 1.0, n=len(y), detail="sin eventos")
    rng = np.random.default_rng(seed)
    count = 0
    for _ in range(n_permutations):
        shuffled = rng.permutation(y)
        value = roc_auc(shuffled, p)
        if value is not None and value >= observed:
            count += 1
    p_value = (count + 1) / (n_permutations + 1)
    return TestResult(
        name="permutacion_auc",
        statistic=float(observed),
        p_value=float(p_value),
        effect_size=float(2 * (observed - 0.5)),
        n=int(len(y)),
        detail="AUC comparada contra etiquetas barajadas al azar.",
    )


def binomial_event_test(successes: int, trials: int, expected: float) -> TestResult:
    """¿La frecuencia observada difiere de la esperada más de lo normal?"""
    if trials == 0:
        return TestResult("binomial", float("nan"), 1.0, n=0, detail="sin observaciones")
    expected = float(np.clip(expected, 1e-6, 1 - 1e-6))
    result = stats.binomtest(int(successes), int(trials), expected)
    observed = successes / trials
    interval = result.proportion_ci(confidence_level=0.95)
    return TestResult(
        name="binomial_exacta",
        statistic=float(observed),
        p_value=float(result.pvalue),
        effect_size=cohens_h(observed, expected),
        ci_low=float(interval.low),
        ci_high=float(interval.high),
        n=int(trials),
        detail=f"{successes} de {trials} frente a una expectativa de {expected:.3%}.",
    )


def cohens_h(p1: float, p2: float) -> float:
    """Tamaño de efecto entre dos proporciones.

    |h| < 0.2 es pequeño; 0.2-0.5 moderado; > 0.5 grande. Sirve para no
    confundir "estadísticamente significativo" con "suficientemente grande
    para que importe".
    """
    p1 = float(np.clip(p1, 0.0, 1.0))
    p2 = float(np.clip(p2, 0.0, 1.0))
    return float(2 * np.arcsin(np.sqrt(p1)) - 2 * np.arcsin(np.sqrt(p2)))


def effect_size_label(h: float) -> str:
    magnitude = abs(h)
    if magnitude < 0.1:
        return "insignificante"
    if magnitude < 0.2:
        return "muy pequeño"
    if magnitude < 0.5:
        return "moderado"
    if magnitude < 0.8:
        return "grande"
    return "muy grande"


def benjamini_hochberg(p_values: list[float], alpha: float = 0.10) -> list[bool]:
    """Corrección por pruebas múltiples controlando la tasa de falsos hallazgos.

    Si se prueban 15 ideas, alguna dará p < 0.05 por puro azar. Esto lo
    corrige sin ser tan brutal como Bonferroni.
    """
    n = len(p_values)
    if n == 0:
        return []
    order = np.argsort(p_values)
    sorted_p = np.asarray(p_values, dtype=float)[order]
    thresholds = alpha * (np.arange(1, n + 1) / n)
    passed = sorted_p <= thresholds
    cutoff = np.max(np.where(passed)[0]) + 1 if passed.any() else 0
    decisions = np.zeros(n, dtype=bool)
    decisions[order[:cutoff]] = True
    return decisions.tolist()


def bootstrap_proportion_ci(
    successes: int, trials: int, alpha: float = 0.05
) -> tuple[float, float]:
    """Intervalo de Wilson: mejor que el normal con muestras chicas."""
    if trials == 0:
        return float("nan"), float("nan")
    z = stats.norm.ppf(1 - alpha / 2)
    phat = successes / trials
    denominator = 1 + z**2 / trials
    center = (phat + z**2 / (2 * trials)) / denominator
    margin = z * np.sqrt(phat * (1 - phat) / trials + z**2 / (4 * trials**2)) / denominator
    return float(max(0.0, center - margin)), float(min(1.0, center + margin))
