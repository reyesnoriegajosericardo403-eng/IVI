"""Carga de series de mercado: fuentes, caché, limpieza y procedencia."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import timedelta

import pandas as pd

from ..config import DEFAULT_HISTORY_DAYS, cache_dir
from . import aliases, quality
from .schema import DataUnavailable, MarketData, utcnow
from .sources import DEFAULT_SOURCE_ORDER, DataSource, SourceError, build_source

#: Horas que un dato diario se considera fresco en caché.
CACHE_TTL_HOURS = 6


@dataclass
class LoadResult:
    """Serie principal más el contexto que sí se pudo conseguir."""

    primary: MarketData
    companions: dict[str, MarketData] = field(default_factory=dict)
    attempts: list[dict] = field(default_factory=list)
    missing_companions: dict[str, str] = field(default_factory=dict)

    def provenance(self) -> dict:
        return {
            "primary": self.primary.provenance(),
            "companions": {k: v.provenance() for k, v in self.companions.items()},
            "companions_unavailable": dict(self.missing_companions),
            "source_attempts": list(self.attempts),
        }


class MarketDataLoader:
    """Obtiene datos verificables y, si no puede, lo dice."""

    def __init__(
        self,
        source_order: tuple[str, ...] = DEFAULT_SOURCE_ORDER,
        use_cache: bool = True,
        ttl_hours: float = CACHE_TTL_HOURS,
        allow_synthetic: bool = False,
    ):
        self.source_order = tuple(source_order)
        self.use_cache = use_cache
        self.ttl_hours = ttl_hours
        self.allow_synthetic = allow_synthetic

    # ------------------------------------------------------------- caché
    def _cache_paths(self, symbol: str, source: str) -> tuple[str, str]:
        safe = symbol.replace("/", "_").replace("^", "idx_").replace("=", "_")
        base = os.path.join(cache_dir(), f"{safe}__{source}")
        return base + ".csv", base + ".json"

    def _read_cache(self, symbol: str, source: str) -> MarketData | None:
        if not self.use_cache:
            return None
        data_path, meta_path = self._cache_paths(symbol, source)
        if not (os.path.isfile(data_path) and os.path.isfile(meta_path)):
            return None
        try:
            with open(meta_path, encoding="utf-8") as handle:
                meta = json.load(handle)
            retrieved = pd.Timestamp(meta["retrieved_at"]).to_pydatetime()
            if utcnow() - retrieved > timedelta(hours=self.ttl_hours):
                return None
            frame = pd.read_csv(data_path, index_col=0, parse_dates=True)
            frame.attrs["adjusted"] = bool(meta.get("adjusted", False))
            return MarketData(
                symbol=meta["symbol"],
                frame=frame,
                source=meta["source"],
                source_url=meta.get("source_url"),
                retrieved_at=retrieved,
                currency=meta.get("currency"),
                exchange=meta.get("exchange"),
                asset_class=meta.get("asset_class"),
                long_name=meta.get("long_name"),
                is_synthetic=bool(meta.get("is_synthetic", False)),
                notes=list(meta.get("notes", [])) + ["Servido desde caché local."],
            )
        except Exception:  # noqa: BLE001 - una caché ilegible simplemente se ignora
            return None

    def _write_cache(self, data: MarketData) -> None:
        if not self.use_cache or data.is_synthetic:
            return
        data_path, meta_path = self._cache_paths(data.symbol, data.source)
        try:
            data.frame.to_csv(data_path)
            meta = data.provenance()
            meta["adjusted"] = bool(data.frame.attrs.get("adjusted", False))
            meta["retrieved_at"] = data.retrieved_at.isoformat()
            with open(meta_path, "w", encoding="utf-8") as handle:
                json.dump(meta, handle, ensure_ascii=False)
        except Exception:  # noqa: BLE001 - no poder cachear no rompe nada
            pass

    # ------------------------------------------------------------ descarga
    def _finalize(self, data: MarketData) -> MarketData:
        frame, stats = quality.normalize_frame(data.frame)
        frame.attrs["adjusted"] = bool(data.frame.attrs.get("adjusted", False))
        data.frame = frame
        data.quality = quality.assess(frame, stats)
        data.asset_class = aliases.guess_asset_class(data.symbol, data.asset_class)
        return data

    def fetch_symbol(
        self, symbol: str, days: int = DEFAULT_HISTORY_DAYS
    ) -> tuple[MarketData | None, list[dict]]:
        """Devuelve la serie y la bitácora de lo que se intentó."""
        attempts: list[dict] = []
        order = list(self.source_order)
        if self.allow_synthetic:
            order.append("synthetic_test_fixture")

        for name in order:
            cached = self._read_cache(symbol, name)
            if cached is not None and len(cached.frame):
                attempts.append({"source": name, "status": "cache_hit", "rows": len(cached.frame)})
                return self._finalize(cached), attempts
            try:
                source: DataSource = build_source(name)
                data = source.fetch(symbol, days)
                if data.frame.empty:
                    raise SourceError("La fuente devolvió una serie vacía.")
                data = self._finalize(data)
                self._write_cache(data)
                if name != "supabase_store" and not data.is_synthetic:
                    # Best-effort: lo que se acaba de conseguir de una fuente
                    # en línea queda en la memoria persistente para la
                    # próxima vez. No hace nada si Supabase no está
                    # configurado (ver data/supabase_store.py).
                    from . import supabase_store

                    supabase_store.write(symbol, data.frame, source=name)
                attempts.append({"source": name, "status": "ok", "rows": len(data.frame)})
                return data, attempts
            except SourceError as exc:
                attempts.append({"source": name, "status": "error", "detail": str(exc)})
            except Exception as exc:  # noqa: BLE001 - se reporta, no se oculta
                attempts.append(
                    {"source": name, "status": "error", "detail": f"{type(exc).__name__}: {exc}"}
                )
        return None, attempts

    def load(
        self,
        symbol: str,
        days: int = DEFAULT_HISTORY_DAYS,
        with_companions: bool = True,
    ) -> LoadResult:
        """Carga el activo y su contexto. Lanza `DataUnavailable` si no hay datos."""
        resolved = aliases.normalize_symbol(symbol)
        if not resolved:
            raise DataUnavailable(symbol, ["No se recibió ningún símbolo."])

        primary, attempts = self.fetch_symbol(resolved, days)
        if primary is None:
            reasons = [f"{a['source']}: {a.get('detail', a['status'])}" for a in attempts]
            raise DataUnavailable(resolved, reasons)

        companions: dict[str, MarketData] = {}
        missing: dict[str, str] = {}
        if with_companions:
            wanted = aliases.companions_for(resolved, primary.asset_class or "equity")
            for role, companion_symbol in wanted.items():
                if primary.is_synthetic:
                    # Una serie simulada no tiene contexto de mercado real que
                    # le corresponda; mezclarlos sería engañoso.
                    missing[role] = "No se busca contexto real para una serie simulada."
                    continue
                series, companion_attempts = self.fetch_symbol(companion_symbol, days)
                if series is None:
                    detail = companion_attempts[-1].get("detail", "no disponible") if companion_attempts else "no disponible"
                    missing[role] = f"{companion_symbol}: {detail}"
                else:
                    companions[role] = series

        return LoadResult(
            primary=primary,
            companions=companions,
            attempts=attempts,
            missing_companions=missing,
        )


def align_companion(primary: pd.DataFrame, companion: pd.DataFrame) -> pd.DataFrame:
    """Alinea una serie de contexto al calendario del activo principal.

    Reindexa por fecha y arrastra hacia adelante el último valor conocido: si
    el mercado de referencia no operó ese día, se usa su último cierre
    *anterior*, nunca uno posterior. Eso mantiene la regla de no mirar al
    futuro. No rellena hacia atrás: antes del primer dato queda vacío.
    """
    aligned = companion.reindex(primary.index.union(companion.index)).sort_index()
    aligned = aligned.ffill().reindex(primary.index)
    return aligned
