"""Modelos que aprenden de las variables: logística y árboles."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .base import Contribution, ProbabilisticModel, SeriesContext

#: Variables cuyo efecto local se reporta en la explicación.
TOP_EXPLAINED = 6


class _FeatureModel(ProbabilisticModel):
    """Base común de los modelos que consumen la matriz de variables."""

    def __init__(self) -> None:
        super().__init__()
        self.columns: list[str] = []
        self.baseline: pd.Series | None = None
        self.estimator = None
        self.single_class: float | None = None

    def _prepare(self, x: pd.DataFrame, y: pd.Series) -> bool:
        self.columns = list(x.columns)
        self.baseline = x.median()
        classes = np.unique(y)
        if len(classes) < 2:
            # Con una sola clase en el entrenamiento no hay nada que aprender;
            # se reporta la tasa base suavizada en vez de inventar un modelo.
            self.single_class = float((y.sum() + 1.0) / (len(y) + 2.0))
            return False
        self.single_class = None
        return True

    def _matrix(self, x: pd.DataFrame) -> np.ndarray:
        return x.reindex(columns=self.columns).to_numpy(dtype=float)

    def predict_proba(self, x: pd.DataFrame, ctx: SeriesContext) -> np.ndarray:
        if self.single_class is not None or self.estimator is None:
            value = self.single_class if self.single_class is not None else self.base_rate
            return self._clip(np.full(len(x), value))
        probabilities = self.estimator.predict_proba(self._matrix(x))[:, 1]
        return self._clip(probabilities)

    def _local_effects(self, x_row: pd.Series, names: list[str]) -> list[Contribution]:
        """Efecto real de cada variable: cuánto cambia la probabilidad si esa
        variable estuviera en su valor típico en vez del de hoy.

        No es una racionalización: es una diferencia medida sobre el propio
        modelo ya entrenado.
        """
        if self.estimator is None or self.baseline is None:
            return []
        row = x_row.reindex(self.columns)
        base_probability = float(
            self.estimator.predict_proba(row.to_frame().T.to_numpy(dtype=float))[:, 1][0]
        )
        contributions: list[Contribution] = []
        for name in names:
            if name not in self.columns:
                continue
            counterfactual = row.copy()
            counterfactual[name] = self.baseline[name]
            probability = float(
                self.estimator.predict_proba(
                    counterfactual.to_frame().T.to_numpy(dtype=float)
                )[:, 1][0]
            )
            effect = base_probability - probability
            if abs(effect) < 1e-6:
                continue
            contributions.append(
                Contribution(
                    feature=name,
                    value=float(row[name]),
                    effect=effect,
                    direction="sube" if effect > 0 else "baja",
                )
            )
        contributions.sort(key=lambda c: abs(c.effect), reverse=True)
        return contributions[:TOP_EXPLAINED]


class LogisticModel(_FeatureModel):
    """Regresión logística regularizada sobre variables estandarizadas.

    Estima directamente la probabilidad del evento y, por ser lineal en
    log-odds, permite decir con honestidad qué variable empujó hacia arriba y
    cuál hacia abajo.
    """

    name = "logistica"
    family = "estadistico"
    purpose = "Estima directamente la probabilidad del evento a partir de las variables."

    def __init__(self, c: float = 0.08):
        super().__init__()
        self.c = c

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "LogisticModel":
        self._record_fit(x, y)
        if not self._prepare(x, y):
            self.diagnostics = {"estado": "una sola clase en el entrenamiento"}
            return self
        self.estimator = Pipeline(
            [
                ("escala", StandardScaler()),
                (
                    "logistica",
                    LogisticRegression(
                        C=self.c,
                        solver="lbfgs",
                        max_iter=3000,
                        random_state=ctx.seed,
                    ),
                ),
            ]
        )
        self.estimator.fit(self._matrix(x), y.to_numpy())
        coefficients = self.estimator.named_steps["logistica"].coef_[0]
        ranked = np.argsort(np.abs(coefficients))[::-1][:TOP_EXPLAINED]
        self.diagnostics = {
            "estado": "ajustado",
            "variables": len(self.columns),
            "C": self.c,
            "coeficientes_top": {self.columns[i]: round(float(coefficients[i]), 4) for i in ranked},
        }
        return self

    def explain(self, x_row: pd.Series, ctx: SeriesContext) -> list[Contribution]:
        if self.estimator is None:
            return []
        scaler = self.estimator.named_steps["escala"]
        coefficients = self.estimator.named_steps["logistica"].coef_[0]
        row = x_row.reindex(self.columns).to_numpy(dtype=float)
        standardized = (row - scaler.mean_) / np.sqrt(np.clip(scaler.var_, 1e-12, None))
        # Aporte en log-odds: coeficiente × cuán inusual es hoy esa variable.
        log_odds = coefficients * standardized
        order = np.argsort(np.abs(log_odds))[::-1][:TOP_EXPLAINED]
        return [
            Contribution(
                feature=self.columns[i],
                value=float(row[i]),
                effect=float(log_odds[i]),
                direction="sube" if log_odds[i] > 0 else "baja",
            )
            for i in order
            if abs(log_odds[i]) > 1e-8
        ]


class RandomForestModel(_FeatureModel):
    """Bosque aleatorio: combinaciones no lineales de variables."""

    name = "random_forest"
    family = "machine_learning"
    purpose = "Encuentra relaciones no lineales y combinaciones entre variables."

    def __init__(
        self,
        n_estimators: int = 250,
        max_depth: int = 6,
        min_samples_leaf: int = 25,
        max_samples: float = 0.7,
    ):
        super().__init__()
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.max_samples = max_samples

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "RandomForestModel":
        self._record_fit(x, y)
        if not self._prepare(x, y):
            self.diagnostics = {"estado": "una sola clase en el entrenamiento"}
            return self
        self.estimator = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_leaf=self.min_samples_leaf,
            max_features="sqrt",
            max_samples=self.max_samples,
            bootstrap=True,
            random_state=ctx.seed,
            n_jobs=-1,
        )
        self.estimator.fit(self._matrix(x), y.to_numpy())
        importances = self.estimator.feature_importances_
        order = np.argsort(importances)[::-1][:TOP_EXPLAINED]
        self.top_features = [self.columns[i] for i in order]
        self.diagnostics = {
            "estado": "ajustado",
            "arboles": self.n_estimators,
            "profundidad_max": self.max_depth,
            "importancias_top": {self.columns[i]: round(float(importances[i]), 4) for i in order},
        }
        return self

    def explain(self, x_row: pd.Series, ctx: SeriesContext) -> list[Contribution]:
        return self._local_effects(x_row, getattr(self, "top_features", self.columns[:TOP_EXPLAINED]))


class GradientBoostingModel(_FeatureModel):
    """Gradient boosting por histogramas: relaciones complejas, rápido."""

    name = "gradient_boosting"
    family = "machine_learning"
    purpose = "Captura relaciones complejas entre variables para afinar la probabilidad."

    def __init__(self, max_iter: int = 200, learning_rate: float = 0.05, max_depth: int = 3):
        super().__init__()
        self.max_iter = max_iter
        self.learning_rate = learning_rate
        self.max_depth = max_depth

    def fit(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> "GradientBoostingModel":
        self._record_fit(x, y)
        if not self._prepare(x, y):
            self.diagnostics = {"estado": "una sola clase en el entrenamiento"}
            return self
        self.estimator = HistGradientBoostingClassifier(
            max_iter=self.max_iter,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            min_samples_leaf=40,
            l2_regularization=1.0,
            early_stopping=False,
            random_state=ctx.seed,
        )
        self.estimator.fit(self._matrix(x), y.to_numpy())
        self._explain_names = (
            self._rank_features(x, y, ctx) if self.compute_explanations else list(self.columns[:TOP_EXPLAINED])
        )
        self.diagnostics = {
            "estado": "ajustado",
            "iteraciones": self.max_iter,
            "learning_rate": self.learning_rate,
            "profundidad_max": self.max_depth,
            "variables_relevantes": list(self._explain_names[:TOP_EXPLAINED]),
        }
        return self

    def _rank_features(self, x: pd.DataFrame, y: pd.Series, ctx: SeriesContext) -> list[str]:
        """Importancia por permutación sobre el tramo final del entrenamiento.

        Solo decide *qué* variables se explican; el efecto que se reporta al
        usuario se mide después sobre el modelo real, fila por fila.
        """
        tail = min(len(x), 250)
        if tail < 60:
            return list(self.columns[:TOP_EXPLAINED])
        sample_x = self._matrix(x.iloc[-tail:])
        sample_y = y.iloc[-tail:].to_numpy()
        if len(np.unique(sample_y)) < 2:
            return list(self.columns[:TOP_EXPLAINED])
        from sklearn.metrics import log_loss

        rng = np.random.default_rng(ctx.seed + 5)
        reference = log_loss(
            sample_y, self.estimator.predict_proba(sample_x)[:, 1], labels=[0, 1]
        )
        scores = []
        for index, column in enumerate(self.columns):
            shuffled = sample_x.copy()
            shuffled[:, index] = rng.permutation(shuffled[:, index])
            loss = log_loss(
                sample_y, self.estimator.predict_proba(shuffled)[:, 1], labels=[0, 1]
            )
            scores.append((loss - reference, column))
        scores.sort(reverse=True)
        return [name for _, name in scores[: max(TOP_EXPLAINED * 2, 12)]]

    def explain(self, x_row: pd.Series, ctx: SeriesContext) -> list[Contribution]:
        names = getattr(self, "_explain_names", None) or self.columns[:TOP_EXPLAINED]
        return self._local_effects(x_row, list(names))
