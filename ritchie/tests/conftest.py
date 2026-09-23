"""Fixtures compartidas. Todas las series son sintéticas y deterministas."""

from __future__ import annotations

import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from ritchie.config import DecisionConfig, RitchieConfig, ValidationConfig  # noqa: E402
from ritchie.features import TargetSpec, align_xy, build_features, build_target  # noqa: E402
from ritchie.models.base import SeriesContext  # noqa: E402

from synthetic_signal import make_pure_noise, make_series  # noqa: E402


@pytest.fixture(scope="session")
def serie_con_patron():
    """Serie con una ventaja estadística real, conocida de antemano."""
    return make_series(n=1600, seed=7)


@pytest.fixture(scope="session")
def serie_ruido():
    """Paseo aleatorio: no hay absolutamente nada que descubrir."""
    return make_pure_noise(n=1600, seed=11)


@pytest.fixture(scope="session")
def spec():
    return TargetSpec(horizon=1, threshold=0.04, direction="up", mode="close")


@pytest.fixture(scope="session")
def dataset(serie_con_patron, spec):
    """Variables y objetivo ya alineados para la serie con patrón."""
    matrix = build_features(serie_con_patron, {})
    target = build_target(serie_con_patron, spec)
    x, y, index = align_xy(matrix.frame, target)
    return {"market": serie_con_patron, "matrix": matrix, "x": x, "y": y, "index": index}


@pytest.fixture(scope="session")
def contexto(serie_con_patron, spec):
    return SeriesContext(market=serie_con_patron, spec=spec, seed=13, n_paths=300)


@pytest.fixture(scope="session")
def config_rapida():
    """Configuración mínima para que las pruebas corran en segundos."""
    return RitchieConfig(
        seed=13,
        validation=ValidationConfig(min_train=400, refit_every=120, final_test_fraction=0.25),
        decision=DecisionConfig(),
        profile="rapido",
    )
