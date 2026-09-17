"""Capa de datos: fuentes verificables, calidad y procedencia."""

from .loader import LoadResult, MarketDataLoader, align_companion
from .schema import DataQualityReport, DataUnavailable, MarketData

__all__ = [
    "LoadResult",
    "MarketDataLoader",
    "MarketData",
    "DataQualityReport",
    "DataUnavailable",
    "align_companion",
]
