"""Memoria persistente opcional de RITCHIE.

Vive en el MISMO proyecto de Supabase que ya usa VALU en este monorepo, en
una tabla separada (`ritchie_market_data`, migración 0015) que ningún
cliente puede leer ni escribir — solo el servidor de RITCHIE, con la clave
`service_role`. Guarda cualquier vela diaria que el motor haya conseguido
alguna vez, sea de una fuente en línea (Yahoo, Stooq, Alpha Vantage) o de un
CSV que la persona subió a mano cuando ninguna fuente respondía. La próxima
vez que se pregunte por ese símbolo, esta es la primera fuente que se prueba
— y si ya cubre el rango pedido, ni siquiera hace falta salir a internet.

Se activa solo con dos variables de entorno:
  RITCHIE_SUPABASE_URL          — la misma "Project URL" que usa VALU.
  RITCHIE_SUPABASE_SERVICE_KEY  — la clave "service_role" (Settings → API
                                   → Project API keys). NUNCA la "anon": esa
                                   clave respeta Row Level Security (que
                                   aquí no deja pasar a nadie); la
                                   `service_role` la ignora a propósito, así
                                   que solo debe vivir en el servidor —
                                   jamás en el navegador ni en un repositorio.

Sin esas dos variables, RITCHIE funciona exactamente igual que siempre: solo
pierde la memoria entre reinicios y el apartado de "subir tus datos" avisa
que no hay dónde guardarlos de forma permanente.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone

import pandas as pd

from .schema import MarketData, utcnow
from .sources import DataSource, SourceError, _apply_adjustment, _http_get

TABLE = "ritchie_market_data"


def configured() -> bool:
    return bool(_url() and _key())


def _url() -> str:
    return os.environ.get("RITCHIE_SUPABASE_URL", "").strip()


def _key() -> str:
    return os.environ.get("RITCHIE_SUPABASE_SERVICE_KEY", "").strip()


def _base_url() -> str:
    return f"{_url().rstrip('/')}/rest/v1/{TABLE}"


def _headers() -> dict:
    key = _key()
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _clean(value) -> float | None:
    """A número de Python o None — nunca deja pasar NaN a una escritura JSON."""
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None  # number != number solo cuando es NaN


class SupabaseStoreSource(DataSource):
    """Lee la memoria persistente. Es una fuente más del registro: si no
    hay nada guardado para el símbolo pedido, falla igual que cualquier
    otra fuente sin datos — el cargador sigue probando las siguientes."""

    name = "supabase_store"

    def fetch(self, symbol: str, days: int) -> MarketData:
        if not configured():
            raise SourceError("La memoria persistente no está configurada.")
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        params = {
            "symbol": f"eq.{symbol.upper()}",
            "session_date": f"gte.{cutoff}",
            "order": "session_date.asc",
            "select": "session_date,open,high,low,close,adj_close,volume,source",
        }
        try:
            text = _http_get(_base_url(), params=params, headers=_headers())
            rows = json.loads(text)
        except SourceError:
            raise
        except Exception as exc:  # noqa: BLE001 - se reporta tal cual
            raise SourceError(f"No se pudo leer la memoria persistente: {exc}") from exc
        if not rows:
            raise SourceError(f"No hay nada guardado todavía para «{symbol}».")

        frame = pd.DataFrame(rows).rename(columns={"session_date": "date"})
        frame = frame.set_index(pd.to_datetime(frame["date"]))
        keep = [c for c in ("open", "high", "low", "close", "adj_close", "volume") if c in frame.columns]
        frame = frame[keep].apply(pd.to_numeric, errors="coerce")
        frame = _apply_adjustment(frame)

        origin = rows[-1].get("source") or "desconocida"
        return MarketData(
            symbol=symbol.upper(),
            frame=frame,
            source=self.name,
            source_url=None,
            retrieved_at=utcnow(),
            notes=[f"Servido desde la memoria persistente de RITCHIE (guardado originalmente vía {origin})."],
        )


def write(symbol: str, frame: pd.DataFrame, source: str) -> int:
    """Guarda o actualiza filas en la memoria persistente.

    Best-effort a propósito: si Supabase no está configurado o la escritura
    falla por lo que sea (red, cuota, clave vencida), simplemente no se
    guarda nada — nunca rompe la respuesta que ya se le va a dar a la
    persona. Guardar memoria es una optimización, no algo de lo que el
    análisis dependa.
    """
    if not configured() or frame is None or frame.empty:
        return 0
    try:
        import requests
    except ImportError:
        return 0

    adjusted = bool(frame.attrs.get("adjusted", False))
    records = []
    for date, row in frame.iterrows():
        raw_close = _clean(row.get("raw_close", row.get("close")))
        if raw_close is None:
            continue
        record = {
            "symbol": symbol.upper(),
            "session_date": pd.Timestamp(date).strftime("%Y-%m-%d"),
            "close": raw_close,
            "source": source,
        }
        if adjusted:
            adj = _clean(row.get("close"))
            if adj is not None:
                record["adj_close"] = adj
        for column in ("open", "high", "low", "volume"):
            value = _clean(row.get(column))
            if value is not None:
                record[column] = value
        records.append(record)
    if not records:
        return 0

    try:
        response = requests.post(
            _base_url(),
            headers={**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            params={"on_conflict": "symbol,session_date"},
            json=records,
            timeout=30,
        )
        if response.status_code >= 400:
            return 0
        return len(records)
    except Exception:  # noqa: BLE001 - ver docstring: nunca debe romper la respuesta
        return 0
