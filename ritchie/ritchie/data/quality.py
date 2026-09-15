"""Auditoría de calidad de una serie de precios.

Detecta lo que rompe un modelo sin avisar: fechas duplicadas, huecos de
calendario, precios congelados, movimientos imposibles, splits sin ajustar y
filas incompletas. No arregla nada inventando: limpia lo que es
inequívocamente basura (duplicados, filas sin cierre) y reporta el resto.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .schema import ALL_COLUMNS, REQUIRED_COLUMNS, DataQualityReport

#: Movimiento diario a partir del cual sospechamos un error de datos o un
#: split sin ajustar (no un movimiento real de mercado).
EXTREME_MOVE = 0.60
#: Proporciones típicas de split que dejan una caída artificial en el precio.
COMMON_SPLIT_RATIOS = (2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30)
#: Días naturales seguidos sin dato que consideramos hueco anómalo
#: (cubre puentes y feriados largos sin marcar falsos positivos).
LONG_GAP_DAYS = 10
#: Sesiones consecutivas con el mismo cierre que consideramos precio congelado.
STALE_RUN = 4


def normalize_frame(frame: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, int]]:
    """Ordena, deduplica y descarta filas inservibles.

    Devuelve el marco limpio y el conteo de lo que se quitó. Nunca rellena
    valores: una fila sin cierre se elimina, no se inventa.
    """
    stats = {"duplicate_dates": 0, "rows_dropped": 0, "missing_close": 0}
    if frame.empty:
        return frame, stats

    work = frame.copy()
    work.index = pd.to_datetime(work.index).tz_localize(None).normalize()
    work = work.sort_index()

    duplicated = work.index.duplicated(keep="last")
    stats["duplicate_dates"] = int(duplicated.sum())
    work = work[~duplicated]

    for column in ALL_COLUMNS:
        if column in work.columns:
            work[column] = pd.to_numeric(work[column], errors="coerce")

    before = len(work)
    missing_close = int(work["close"].isna().sum()) if "close" in work else before
    stats["missing_close"] = missing_close

    required = [c for c in REQUIRED_COLUMNS if c in work.columns]
    work = work.dropna(subset=required)
    # Un precio de cero o negativo no es un precio.
    for column in required:
        work = work[work[column] > 0]
    stats["rows_dropped"] = before - len(work)
    return work, stats


def _count_stale_runs(close: pd.Series, run: int = STALE_RUN) -> int:
    if len(close) < run:
        return 0
    same = close.diff().eq(0).astype(int)
    count, streak = 0, 0
    for value in same.to_numpy():
        streak = streak + 1 if value else 0
        if streak == run - 1:
            count += 1
    return count


def _count_suspected_splits(close: pd.Series) -> int:
    """Caídas de un día que coinciden con una razón de split conocida."""
    if len(close) < 2:
        return 0
    ratio = (close.shift(1) / close).dropna()
    suspects = 0
    for value in ratio.to_numpy():
        if value < 1.7:
            continue
        for candidate in COMMON_SPLIT_RATIOS:
            if abs(value - candidate) / candidate < 0.03:
                suspects += 1
                break
    return suspects


def assess(frame: pd.DataFrame, stats: dict[str, int] | None = None) -> DataQualityReport:
    """Calcula el reporte de calidad y una puntuación 0-1."""
    stats = stats or {}
    issues: list[str] = []
    rows = len(frame)
    if rows == 0:
        return DataQualityReport(
            rows=0,
            first_date=None,
            last_date=None,
            score=0.0,
            issues=["La serie llegó vacía."],
        )

    close = frame["close"]
    has_volume = "volume" in frame.columns and frame["volume"].notna().any()
    has_adj = bool(frame.attrs.get("adjusted", False))

    gaps = frame.index.to_series().diff().dt.days.dropna()
    max_gap = int(gaps.max()) if len(gaps) else 0
    long_gaps = int((gaps > LONG_GAP_DAYS).sum())

    returns = close.pct_change().dropna()
    extreme = int((returns.abs() > EXTREME_MOVE).sum())
    stale = _count_stale_runs(close)
    splits = _count_suspected_splits(close)

    zero_volume = 0
    missing_volume = 0
    if has_volume:
        volume = frame["volume"]
        missing_volume = int(volume.isna().sum())
        zero_volume = int((volume.fillna(0) <= 0).sum())

    inconsistent = 0
    if {"high", "low", "open", "close"}.issubset(frame.columns):
        bad_high = frame["high"] < frame[["open", "close", "low"]].max(axis=1) - 1e-9
        bad_low = frame["low"] > frame[["open", "close", "high"]].min(axis=1) + 1e-9
        inconsistent = int((bad_high | bad_low).sum())

    score = 1.0
    if stats.get("duplicate_dates"):
        issues.append(f"{stats['duplicate_dates']} fechas duplicadas (se quedó la última).")
        score -= min(0.10, stats["duplicate_dates"] / max(rows, 1))
    if stats.get("rows_dropped"):
        issues.append(f"{stats['rows_dropped']} filas incompletas o con precios no válidos se descartaron.")
        score -= min(0.15, stats["rows_dropped"] / max(rows, 1) * 2)
    if long_gaps:
        issues.append(f"{long_gaps} huecos de más de {LONG_GAP_DAYS} días naturales sin cotización.")
        score -= min(0.10, long_gaps * 0.01)
    if stale:
        issues.append(f"{stale} tramos con el precio congelado {STALE_RUN}+ sesiones seguidas.")
        score -= min(0.15, stale * 0.02)
    if extreme:
        issues.append(f"{extreme} movimientos diarios mayores a {int(EXTREME_MOVE * 100)}% (revisar splits o errores de la fuente).")
        score -= min(0.15, extreme * 0.03)
    if splits and not has_adj:
        issues.append(f"{splits} caídas compatibles con splits sin ajustar y la fuente no trae precio ajustado.")
        score -= min(0.25, splits * 0.08)
    if inconsistent:
        issues.append(f"{inconsistent} sesiones con máximo/mínimo incoherentes.")
        score -= min(0.15, inconsistent / max(rows, 1) * 5)
    if not has_volume:
        issues.append("La fuente no entrega volumen: las variables de volumen quedan fuera.")
        score -= 0.05
    if not has_adj:
        issues.append("La fuente no entrega precio ajustado: dividendos y splits pueden distorsionar los rendimientos.")
        score -= 0.05

    score = float(np.clip(score, 0.0, 1.0))

    return DataQualityReport(
        rows=rows,
        first_date=frame.index[0].strftime("%Y-%m-%d"),
        last_date=frame.index[-1].strftime("%Y-%m-%d"),
        missing_close=int(stats.get("missing_close", 0)),
        missing_volume=missing_volume,
        duplicate_dates=int(stats.get("duplicate_dates", 0)),
        rows_dropped=int(stats.get("rows_dropped", 0)),
        max_calendar_gap_days=max_gap,
        long_gaps=long_gaps,
        stale_price_runs=stale,
        zero_volume_days=zero_volume,
        extreme_moves=extreme,
        suspected_unadjusted_splits=splits,
        non_positive_prices=0,
        inconsistent_ohlc=inconsistent,
        has_adjusted_close=has_adj,
        has_volume=bool(has_volume),
        score=score,
        issues=issues,
    )
