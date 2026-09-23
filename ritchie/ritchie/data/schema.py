"""Estructuras de datos de mercado con procedencia obligatoria.

Regla dura del sistema: ningún valor de mercado puede existir en RITCHIE sin
saber de dónde salió y cuándo se obtuvo. Si un dato falta, falta — nunca se
rellena con una invención.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import pandas as pd

#: Columnas que toda serie debe traer.
REQUIRED_COLUMNS = ("open", "high", "low", "close")
#: Columnas opcionales que se usan si existen.
OPTIONAL_COLUMNS = ("adj_close", "volume")
ALL_COLUMNS = REQUIRED_COLUMNS + OPTIONAL_COLUMNS


class DataUnavailable(RuntimeError):
    """No se pudo obtener información verificable para el activo pedido.

    Se lanza en vez de devolver datos parciales o inventados.
    """

    def __init__(self, symbol: str, reasons: list[str]):
        self.symbol = symbol
        self.reasons = reasons
        super().__init__(
            f"No hay datos verificables para «{symbol}». " + " | ".join(reasons)
        )


@dataclass(frozen=True)
class DataQualityReport:
    """Diagnóstico honesto de la serie descargada."""

    rows: int
    first_date: str | None
    last_date: str | None
    missing_close: int = 0
    missing_volume: int = 0
    duplicate_dates: int = 0
    rows_dropped: int = 0
    max_calendar_gap_days: int = 0
    long_gaps: int = 0
    stale_price_runs: int = 0
    zero_volume_days: int = 0
    extreme_moves: int = 0
    suspected_unadjusted_splits: int = 0
    non_positive_prices: int = 0
    inconsistent_ohlc: int = 0
    has_adjusted_close: bool = False
    has_volume: bool = False
    score: float = 1.0
    issues: list[str] = field(default_factory=list)

    @property
    def usable(self) -> bool:
        return self.rows > 0 and self.score > 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "rows": self.rows,
            "first_date": self.first_date,
            "last_date": self.last_date,
            "missing_close": self.missing_close,
            "missing_volume": self.missing_volume,
            "duplicate_dates": self.duplicate_dates,
            "rows_dropped": self.rows_dropped,
            "max_calendar_gap_days": self.max_calendar_gap_days,
            "long_gaps": self.long_gaps,
            "stale_price_runs": self.stale_price_runs,
            "zero_volume_days": self.zero_volume_days,
            "extreme_moves": self.extreme_moves,
            "suspected_unadjusted_splits": self.suspected_unadjusted_splits,
            "non_positive_prices": self.non_positive_prices,
            "inconsistent_ohlc": self.inconsistent_ohlc,
            "has_adjusted_close": self.has_adjusted_close,
            "has_volume": self.has_volume,
            "score": round(self.score, 4),
            "issues": list(self.issues),
        }


@dataclass
class MarketData:
    """Serie OHLCV de un activo, con su procedencia pegada al dato."""

    symbol: str
    frame: pd.DataFrame
    source: str
    retrieved_at: datetime
    source_url: str | None = None
    currency: str | None = None
    exchange: str | None = None
    asset_class: str | None = None
    long_name: str | None = None
    is_synthetic: bool = False
    quality: DataQualityReport | None = None
    notes: list[str] = field(default_factory=list)

    # ---------------------------------------------------------------- acceso
    @property
    def close(self) -> pd.Series:
        """Cierre ajustado por splits/dividendos cuando la fuente lo trae."""
        return self.frame["close"]

    @property
    def raw_close(self) -> pd.Series:
        """Cierre sin ajustar — el precio que ve el usuario en su pantalla."""
        column = "raw_close" if "raw_close" in self.frame else "close"
        return self.frame[column]

    @property
    def last_price(self) -> float:
        return float(self.raw_close.iloc[-1])

    @property
    def last_date(self) -> pd.Timestamp:
        return self.frame.index[-1]

    @property
    def returns(self) -> pd.Series:
        """Rendimientos simples de cierre a cierre (ajustados)."""
        return self.close.pct_change()

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self.frame)

    def provenance(self) -> dict[str, Any]:
        """Bloque de procedencia que acompaña a toda respuesta."""
        return {
            "symbol": self.symbol,
            "source": self.source,
            "source_url": self.source_url,
            "retrieved_at": self.retrieved_at.astimezone(timezone.utc).isoformat(),
            "first_date": self.frame.index[0].strftime("%Y-%m-%d") if len(self.frame) else None,
            "last_date": self.frame.index[-1].strftime("%Y-%m-%d") if len(self.frame) else None,
            "rows": len(self.frame),
            "currency": self.currency,
            "exchange": self.exchange,
            "asset_class": self.asset_class,
            "long_name": self.long_name,
            "is_synthetic": self.is_synthetic,
            "quality": self.quality.to_dict() if self.quality else None,
            "notes": list(self.notes),
        }

    def slice_until(self, when: pd.Timestamp) -> "MarketData":
        """Copia de la serie recortada hasta `when` inclusive.

        Herramienta central del sistema anti-look-ahead: cualquier cálculo
        "como se veía el día X" pasa por aquí.
        """
        cut = self.frame.loc[:when]
        return MarketData(
            symbol=self.symbol,
            frame=cut,
            source=self.source,
            retrieved_at=self.retrieved_at,
            source_url=self.source_url,
            currency=self.currency,
            exchange=self.exchange,
            asset_class=self.asset_class,
            long_name=self.long_name,
            is_synthetic=self.is_synthetic,
            quality=self.quality,
            notes=list(self.notes),
        )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
