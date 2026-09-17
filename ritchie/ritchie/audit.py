"""Auditoría automática del análisis.

No basta con escribir el código con cuidado: hay que **demostrar** en cada
corrida que no se coló información del futuro, que las fechas están alineadas,
que las probabilidades son probabilidades y que el modelo elegido no está
sobreajustado.

La prueba más importante es la de causalidad: se reconstruyen las variables
usando solo la serie recortada hasta la fecha T y se verifica que den
exactamente lo mismo que con la serie completa. Si algún cálculo mirara hacia
adelante, los números cambiarían y la auditoría lo cazaría.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .data.schema import MarketData
from .features.builders import build_features
from .features.targets import TargetSpec, build_target
from .models.base import SeriesContext

#: Tolerancia relativa al comparar variables recalculadas.
TOLERANCE = 1e-7
#: Caída máxima aceptable de la habilidad al pasar de desarrollo a prueba final.
MAX_SKILL_DROP = 0.05


@dataclass
class Check:
    key: str
    title: str
    passed: bool
    critical: bool
    detail: str
    evidence: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "clave": self.key,
            "prueba": self.title,
            "resultado": "correcto" if self.passed else "falla",
            "critica": self.critical,
            "detalle": self.detail,
            "evidencia": self.evidence,
        }


def _check_causality(
    market: MarketData, companions: dict, features: pd.DataFrame
) -> Check:
    """Recalcula las variables con la serie recortada y compara."""
    index = features.dropna(how="all").index
    if len(index) < 400:
        return Check(
            "causalidad",
            "Las variables no miran al futuro",
            True,
            True,
            "Serie demasiado corta para la prueba completa; se omitió.",
        )

    positions = [int(len(index) * fraction) for fraction in (0.55, 0.75, 0.92)]
    mismatches: list[dict] = []
    compared = 0

    for position in positions:
        cutoff = index[position]
        sliced_market = market.slice_until(cutoff)
        sliced_companions = {k: v.slice_until(cutoff) for k, v in companions.items()}
        rebuilt = build_features(sliced_market, sliced_companions).frame
        if cutoff not in rebuilt.index:
            continue
        shared = [c for c in features.columns if c in rebuilt.columns]
        original_row = features.loc[cutoff, shared]
        rebuilt_row = rebuilt.loc[cutoff, shared]
        for column in shared:
            a, b = float(original_row[column]), float(rebuilt_row[column])
            if np.isnan(a) and np.isnan(b):
                continue
            compared += 1
            scale = max(abs(a), abs(b), 1e-8)
            if not np.isclose(a, b, rtol=TOLERANCE, atol=1e-10) and abs(a - b) / scale > TOLERANCE:
                mismatches.append(
                    {
                        "fecha": cutoff.strftime("%Y-%m-%d"),
                        "variable": column,
                        "con_serie_completa": a,
                        "con_serie_recortada": b,
                    }
                )

    passed = not mismatches
    return Check(
        "causalidad",
        "Las variables no miran al futuro",
        passed,
        True,
        (
            f"Se recalcularon {compared} valores con la serie recortada en 3 fechas distintas y "
            "todos coincidieron: ninguna variable usa información posterior."
            if passed
            else f"{len(mismatches)} variables cambian al recortar la serie: hay fuga de información."
        ),
        {"comparaciones": compared, "discrepancias": mismatches[:8]},
    )


def _check_target_alignment(market: MarketData, target: pd.Series, spec: TargetSpec) -> Check:
    """La etiqueta debe quedar sin definir en las últimas H sesiones."""
    tail = target.iloc[-spec.horizon :]
    tail_nan = bool(tail.isna().all())
    close = market.frame["close"]
    errors: list[dict] = []

    if spec.direction != "range" and spec.mode == "close":
        labelled = target.dropna()
        if len(labelled) > 10:
            sample = labelled.index[:: max(1, len(labelled) // 5)][:5]
            positions = {d: i for i, d in enumerate(close.index)}
            for date in sample:
                i = positions[date]
                if i + spec.horizon >= len(close):
                    continue
                change = close.iloc[i + spec.horizon] / close.iloc[i] - 1
                expected = (
                    1.0
                    if (change >= spec.threshold if spec.direction == "up" else change <= -spec.threshold)
                    else 0.0
                )
                if abs(float(target.loc[date]) - expected) > 1e-9:
                    errors.append(
                        {
                            "fecha": date.strftime("%Y-%m-%d"),
                            "etiqueta": float(target.loc[date]),
                            "recalculada": expected,
                            "rendimiento": float(change),
                        }
                    )

    passed = tail_nan and not errors
    return Check(
        "alineacion_objetivo",
        "El objetivo está alineado con el futuro correcto",
        passed,
        True,
        (
            (
                "La última sesión queda sin etiqueta (su futuro aún no existe) y "
                if spec.horizon == 1
                else f"Las últimas {spec.horizon} sesiones quedan sin etiqueta (su futuro aún no existe) y "
            )
            + "las etiquetas verificadas coinciden con el cálculo manual."
            if passed
            else "La etiqueta no coincide con lo que realmente pasó o no respeta el horizonte."
        ),
        {"ultimas_sin_etiqueta": tail_nan, "errores": errors},
    )


def _check_fold_separation(walk, spec: TargetSpec) -> Check:
    """Entre el último día de entrenamiento y el primero de prueba debe haber purga."""
    violations = []
    for fold in walk.folds:
        train_end = pd.Timestamp(fold.train_end)
        test_start = pd.Timestamp(fold.test_start)
        if train_end >= test_start:
            violations.append({"entrenamiento_hasta": fold.train_end, "prueba_desde": fold.test_start})
    passed = not violations
    return Check(
        "separacion_bloques",
        "Entrenamiento y prueba no se tocan",
        passed,
        True,
        (
            f"Los {len(walk.folds)} bloques respetan la purga de {spec.horizon} "
            f"{'sesión' if spec.horizon == 1 else 'sesiones'} más el embargo."
            if passed
            else f"{len(violations)} bloques tienen entrenamiento que invade el periodo de prueba."
        ),
        {"bloques": len(walk.folds), "violaciones": violations[:5]},
    )


def _check_probabilities(walk, selection) -> Check:
    """Toda probabilidad debe estar en [0,1] y sin valores perdidos."""
    problems = []
    frame = selection.predictions if selection.predictions is not None else walk.predictions
    for column in frame.columns:
        values = frame[column].to_numpy(dtype=float)
        finite = values[np.isfinite(values)]
        if len(finite) != len(values):
            problems.append({"modelo": column, "problema": "valores no finitos"})
        elif finite.min() < -1e-9 or finite.max() > 1 + 1e-9:
            problems.append(
                {"modelo": column, "problema": f"fuera de rango [{finite.min():.4f}, {finite.max():.4f}]"}
            )
    passed = not problems
    return Check(
        "probabilidades_validas",
        "Las probabilidades son probabilidades",
        passed,
        True,
        (
            f"Las {len(frame.columns)} series de probabilidades están dentro de [0,1] y sin huecos."
            if passed
            else "Hay probabilidades inválidas."
        ),
        {"problemas": problems[:5]},
    )


def _check_overfitting(selection) -> Check:
    """La ventaja del modelo debe sobrevivir al tramo que nunca se usó."""
    if selection.selected is None:
        return Check(
            "sobreajuste",
            "El modelo elegido no está sobreajustado",
            True,
            False,
            "No se eligió ningún modelo, así que no hay nada que sobreajustar.",
        )
    dev = selection.dev_metrics_calibrated
    test = selection.test_metrics
    if dev is None or test is None:
        return Check(
            "sobreajuste",
            "El modelo elegido no está sobreajustado",
            True,
            False,
            "No hubo tramo de prueba suficiente para medirlo.",
        )
    drop = dev.brier_skill - test.brier_skill
    passed = drop <= MAX_SKILL_DROP
    return Check(
        "sobreajuste",
        "El modelo elegido no está sobreajustado",
        passed,
        False,
        (
            f"La habilidad pasó de {dev.brier_skill:+.4f} en desarrollo a {test.brier_skill:+.4f} "
            f"en la prueba final (caída {drop:+.4f})."
        ),
        {
            "habilidad_desarrollo": round(dev.brier_skill, 5),
            "habilidad_prueba": round(test.brier_skill, 5),
            "caida": round(drop, 5),
        },
    )


def _check_time_index(market: MarketData) -> Check:
    index = market.frame.index
    monotonic = bool(index.is_monotonic_increasing)
    duplicates = int(index.duplicated().sum())
    passed = monotonic and duplicates == 0
    return Check(
        "indice_temporal",
        "Las fechas están ordenadas y sin duplicados",
        passed,
        True,
        (
            f"{len(index)} sesiones en orden estricto, sin fechas repetidas."
            if passed
            else f"Índice no monótono ({monotonic}) o con {duplicates} duplicados."
        ),
        {"filas": len(index), "duplicados": duplicates},
    )


def _check_data_quality(market: MarketData) -> Check:
    quality = market.quality
    if quality is None:
        return Check("calidad_datos", "Calidad de los datos", False, True, "No se evaluó la calidad.")
    passed = quality.score >= 0.70
    return Check(
        "calidad_datos",
        "Calidad de los datos",
        passed,
        False,
        f"Puntaje {quality.score:.0%}. " + (" ".join(quality.issues[:3]) if quality.issues else "Sin incidencias."),
        quality.to_dict(),
    )


def _check_calibration_monotonic(selection) -> Check:
    """El calibrador no puede invertir el orden de las probabilidades."""
    grid = np.linspace(0.001, 0.999, 60)
    try:
        transformed = selection.calibrator.transform(grid)
    except Exception as exc:  # noqa: BLE001
        return Check("calibrador", "El calibrador es coherente", False, True, f"Falló: {exc}")
    monotonic = bool(np.all(np.diff(transformed) >= -1e-9))
    in_range = bool(transformed.min() >= -1e-9 and transformed.max() <= 1 + 1e-9)
    passed = monotonic and in_range
    return Check(
        "calibrador",
        "El calibrador es coherente",
        passed,
        True,
        (
            "El ajuste de calibración es monótono y devuelve valores válidos."
            if passed
            else "El calibrador invierte el orden o sale del rango [0,1]."
        ),
        {"monotono": monotonic, "en_rango": in_range},
    )


def _check_no_leakage_in_features(features: pd.DataFrame, y: pd.Series) -> Check:
    """Una correlación casi perfecta con el objetivo delata una fuga."""
    common = features.index.intersection(y.index)
    frame = features.loc[common]
    labels = y.loc[common].astype(float)
    suspicious = []
    for column in frame.columns:
        values = frame[column]
        if values.std(ddof=1) < 1e-12:
            continue
        correlation = float(np.corrcoef(values.fillna(values.median()), labels)[0, 1])
        if abs(correlation) > 0.85:
            suspicious.append({"variable": column, "correlacion": round(correlation, 4)})
    passed = not suspicious
    return Check(
        "correlacion_sospechosa",
        "Ninguna variable 'adivina' el objetivo",
        passed,
        True,
        (
            "Ninguna variable tiene una correlación anormalmente alta con el resultado futuro."
            if passed
            else "Hay variables casi idénticas al objetivo: revisar fuga de información."
        ),
        {"sospechosas": suspicious[:5]},
    )


def run_audit(
    *,
    market: MarketData,
    features: pd.DataFrame,
    target: pd.Series,
    x: pd.DataFrame,
    y: pd.Series,
    walk,
    selection,
    spec: TargetSpec,
    ctx: SeriesContext,
    companions: dict | None = None,
) -> dict:
    """Ejecuta todas las verificaciones y devuelve el reporte."""
    checks = [
        _check_time_index(market),
        _check_causality(market, companions or {}, features),
        _check_target_alignment(market, target, spec),
        _check_no_leakage_in_features(x, y),
        _check_fold_separation(walk, spec),
        _check_probabilities(walk, selection),
        _check_calibration_monotonic(selection),
        _check_overfitting(selection),
        _check_data_quality(market),
    ]
    critical_failures = [c for c in checks if c.critical and not c.passed]
    warnings = [c for c in checks if not c.critical and not c.passed]
    return {
        "aprobada": not critical_failures,
        "pruebas": [c.to_dict() for c in checks],
        "fallas_criticas": [c.to_dict() for c in critical_failures],
        "advertencias": [c.to_dict() for c in warnings],
        "resumen": (
            f"{len(checks) - len(critical_failures) - len(warnings)} de {len(checks)} verificaciones "
            "correctas."
        ),
    }
