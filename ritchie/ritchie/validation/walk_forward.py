"""Validación temporal hacia adelante (walk-forward).

El único protocolo honesto para series de tiempo: entrenar con el pasado,
predecir el futuro, avanzar y repetir. Está prohibido el split aleatorio.

Dos cuidados que la mayoría de los backtests olvidan:

* **Purga**: si el objetivo mira H sesiones hacia adelante, la etiqueta del
  último día de entrenamiento usa precios que caen *dentro* del periodo de
  prueba. Por eso se recortan las últimas H+embargo filas del entrenamiento.
* **Reentrenamiento periódico**: el modelo no se reajusta cada día (nadie lo
  hace en la vida real); se reajusta cada `refit_every` sesiones y en el
  intervalo predice con los parámetros que ya tenía. Es más lento de más y
  más realista.
"""

from __future__ import annotations

import time
import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..config import ValidationConfig
from ..models.base import ProbabilisticModel, SeriesContext


@dataclass
class Fold:
    """Un bloque de la validación."""

    train_start: str
    train_end: str
    test_start: str
    test_end: str
    n_train: int
    n_test: int
    train_events: int
    test_events: int


@dataclass
class WalkForwardResult:
    predictions: pd.DataFrame
    y: pd.Series
    dev_end: pd.Timestamp
    folds: list[Fold] = field(default_factory=list)
    model_info: dict = field(default_factory=dict)
    timings: dict = field(default_factory=dict)
    fitted_models: dict = field(default_factory=dict)
    elapsed_seconds: float = 0.0
    n_fits: int = 0
    warnings: list[str] = field(default_factory=list)

    @property
    def dev_mask(self) -> np.ndarray:
        return np.asarray(self.predictions.index <= self.dev_end)

    @property
    def test_mask(self) -> np.ndarray:
        return np.asarray(self.predictions.index > self.dev_end)

    def protocol(self) -> dict:
        return {
            "metodo": "walk-forward con ventana expansiva, purga y reentrenamiento periódico",
            "bloques": len(self.folds),
            "ajustes_totales": self.n_fits,
            "predicciones_fuera_de_muestra": int(len(self.predictions)),
            "fin_periodo_seleccion": self.dev_end.strftime("%Y-%m-%d"),
            "predicciones_seleccion": int(self.dev_mask.sum()),
            "predicciones_prueba_final": int(self.test_mask.sum()),
            "segundos": round(self.elapsed_seconds, 2),
            "segundos_por_modelo": {k: round(v, 2) for k, v in sorted(
                self.timings.items(), key=lambda kv: -kv[1]
            )},
            "advertencias": list(self.warnings),
        }


def run_walk_forward(
    models: list[ProbabilisticModel],
    x: pd.DataFrame,
    y: pd.Series,
    ctx: SeriesContext,
    config: ValidationConfig,
    max_train: int | None = 2500,
    progress: callable | None = None,
) -> WalkForwardResult:
    """Ejecuta la validación y devuelve las predicciones fuera de muestra."""
    started = time.time()
    n = len(x)
    horizon = ctx.spec.horizon
    purge = horizon + config.embargo

    first_test = config.min_train + purge
    if n <= first_test + 30:
        raise ValueError(
            f"Se necesitan al menos {first_test + 31} observaciones alineadas y solo hay {n}."
        )

    columns = [m.name for m in models]
    predictions = pd.DataFrame(index=x.index[first_test:], columns=columns, dtype=float)
    folds: list[Fold] = []
    messages: list[str] = []
    timings: dict[str, float] = {m.name: 0.0 for m in models}
    n_fits = 0

    # Durante la validación no se calculan explicaciones: cuestan tiempo y
    # solo hacen falta para la respuesta final.
    for model in models:
        model.compute_explanations = False

    blocks = list(range(first_test, n, config.refit_every))
    for block_number, position in enumerate(blocks):
        train_end = position - purge
        if train_end < config.min_train:
            continue
        train_start = 0 if max_train is None else max(0, train_end - max_train)
        x_train = x.iloc[train_start:train_end]
        y_train = y.iloc[train_start:train_end]
        test_slice = slice(position, min(position + config.refit_every, n))
        x_test = x.iloc[test_slice]
        if x_test.empty:
            continue

        folds.append(
            Fold(
                train_start=x_train.index[0].strftime("%Y-%m-%d"),
                train_end=x_train.index[-1].strftime("%Y-%m-%d"),
                test_start=x_test.index[0].strftime("%Y-%m-%d"),
                test_end=x_test.index[-1].strftime("%Y-%m-%d"),
                n_train=len(x_train),
                n_test=len(x_test),
                train_events=int(y_train.sum()),
                test_events=int(y.iloc[test_slice].sum()),
            )
        )

        for model in models:
            model_started = time.time()
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model.fit(x_train, y_train, ctx)
                    probabilities = model.predict_proba(x_test, ctx)
                n_fits += 1
                timings[model.name] += time.time() - model_started
                predictions.loc[x_test.index, model.name] = np.asarray(probabilities, dtype=float)
            except Exception as exc:  # noqa: BLE001 - un modelo caído no tumba la validación
                message = f"{model.name} falló en el bloque {block_number}: {type(exc).__name__}: {exc}"
                if message not in messages:
                    messages.append(message)

        if progress is not None:
            progress(block_number + 1, len(blocks))

    # Modelos que nunca produjeron nada se retiran de la competencia.
    usable = [c for c in columns if predictions[c].notna().sum() >= 30]
    dropped = sorted(set(columns) - set(usable))
    if dropped:
        messages.append("Modelos sin predicciones utilizables: " + ", ".join(dropped))
    predictions = predictions[usable].dropna(how="all")

    dev_count = max(
        int(len(predictions) * (1 - config.final_test_fraction)),
        len(predictions) - max(config.min_final_test, int(len(predictions) * 0.2)),
    )
    dev_count = int(np.clip(dev_count, 30, max(30, len(predictions) - 20)))
    dev_end = predictions.index[dev_count - 1]

    # Ajuste final con toda la historia etiquetada: es el modelo que responderá
    # la pregunta de hoy.
    fitted: dict[str, ProbabilisticModel] = {}
    info: dict[str, dict] = {}
    final_train_x = x if max_train is None else x.iloc[max(0, len(x) - max_train) :]
    final_train_y = y.loc[final_train_x.index]
    for model in models:
        if model.name not in usable:
            continue
        model.compute_explanations = True
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model.fit(final_train_x, final_train_y, ctx)
            fitted[model.name] = model
            info[model.name] = model.info()
            n_fits += 1
        except Exception as exc:  # noqa: BLE001
            messages.append(f"{model.name} falló en el ajuste final: {exc}")

    return WalkForwardResult(
        predictions=predictions.loc[:, [c for c in usable if c in predictions.columns]],
        y=y.loc[predictions.index],
        dev_end=dev_end,
        folds=folds,
        model_info=info,
        fitted_models=fitted,
        elapsed_seconds=time.time() - started,
        timings=timings,
        n_fits=n_fits,
        warnings=messages,
    )
