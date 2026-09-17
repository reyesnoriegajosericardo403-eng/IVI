"""Pruebas estadísticas y control de falsos hallazgos."""

from .tests import (
    TestResult,
    benjamini_hochberg,
    binomial_event_test,
    block_bootstrap_ci,
    bootstrap_proportion_ci,
    cohens_h,
    effect_size_label,
    paired_brier_test,
    permutation_auc_test,
    reality_check,
)

__all__ = [
    "TestResult",
    "paired_brier_test",
    "reality_check",
    "permutation_auc_test",
    "binomial_event_test",
    "block_bootstrap_ci",
    "bootstrap_proportion_ci",
    "benjamini_hochberg",
    "cohens_h",
    "effect_size_label",
]
