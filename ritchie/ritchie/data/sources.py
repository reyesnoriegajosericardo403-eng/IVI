"""Fuentes de datos de mercado.

Cada fuente devuelve un `MarketData` con procedencia. Si una fuente falla,
lanza `SourceError` con el motivo real (red bloqueada, símbolo inexistente,
respuesta incompleta). El cargador prueba las fuentes en orden y, si todas
fallan, RITCHIE lo dice — no fabrica una serie.
"""

from __future__ import annotations

import csv
import io
import json
import os
import time
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from . import synthetic
from .schema import MarketData, utcnow

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
REQUEST_TIMEOUT = 25


class SourceError(RuntimeError):
    """Una fuente concreta no pudo entregar la serie."""


def _http_get(
    url: str, params: dict | None = None, headers: dict | None = None, max_attempts: int = 4
) -> str:
    """GET con reintentos cortos. Respeta el proxy del entorno.

    Un 429 se reintenta más veces y con más paciencia que cualquier otro
    fallo: en un servidor gratuito (Render, etc.) la IP de salida se
    comparte con muchas otras aplicaciones, así que el límite de
    peticiones de la fuente puede venir de tráfico ajeno, no del propio.
    Si la fuente manda `Retry-After`, se respeta tal cual.
    """
    try:
        import requests  # import perezoso: el motor funciona sin red
    except ImportError as exc:  # pragma: no cover - entorno sin requests
        raise SourceError("La librería `requests` no está instalada.") from exc

    merged = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    }
    merged.update(headers or {})
    last_error: Exception | None = None
    for attempt in range(max_attempts):
        last_attempt = attempt == max_attempts - 1
        try:
            response = requests.get(
                url, params=params, headers=merged, timeout=REQUEST_TIMEOUT
            )
            if response.status_code == 404:
                raise SourceError(f"El símbolo no existe en esta fuente (404): {url}")
            if response.status_code == 429:
                last_error = SourceError("La fuente respondió 429 (demasiadas peticiones).")
                if not last_attempt:
                    retry_after = (response.headers.get("Retry-After") or "").strip()
                    wait = float(retry_after) if retry_after.isdigit() else 2.0 * (attempt + 1)
                    time.sleep(min(wait, 12.0))
                continue
            response.raise_for_status()
            return response.text
        except SourceError:
            raise
        except Exception as exc:  # noqa: BLE001 - se reporta tal cual
            last_error = exc
            if not last_attempt:
                time.sleep(0.8 * (attempt + 1))
    raise SourceError(f"No se pudo contactar la fuente ({type(last_error).__name__}: {last_error}).")


def _apply_adjustment(frame: pd.DataFrame) -> pd.DataFrame:
    """Reescala OHLC y volumen con el factor de ajuste por splits/dividendos.

    `close` pasa a ser la serie ajustada (la que usan los modelos) y
    `raw_close` conserva el precio que el usuario ve en su pantalla.
    """
    if "adj_close" not in frame.columns or frame["adj_close"].isna().all():
        frame = frame.copy()
        frame["raw_close"] = frame["close"]
        frame.attrs["adjusted"] = False
        return frame

    work = frame.copy()
    factor = (work["adj_close"] / work["close"]).replace([np.inf, -np.inf], np.nan)
    factor = factor.where(factor > 0).ffill().bfill().fillna(1.0)
    work["raw_close"] = work["close"]
    for column in ("open", "high", "low"):
        if column in work.columns:
            work[column] = work[column] * factor
    work["close"] = work["adj_close"]
    if "volume" in work.columns:
        work["volume"] = work["volume"] / factor
    work.attrs["adjusted"] = True
    return work


class DataSource(ABC):
    """Interfaz común de las fuentes."""

    name: str = "abstract"
    requires_network: bool = True

    @abstractmethod
    def fetch(self, symbol: str, days: int) -> MarketData:
        """Descarga `days` días naturales de historia diaria."""


# --------------------------------------------------------------------- Yahoo
class YahooFinanceSource(DataSource):
    """Yahoo Finance (endpoint público de gráficos, sin llave).

    Es la fuente preferida: cubre acciones, ETFs, índices, FIBRAs/REITs,
    materias primas y criptomonedas, y entrega precio ajustado.
    """

    name = "yahoo_finance"
    hosts = ("query1.finance.yahoo.com", "query2.finance.yahoo.com")

    def fetch(self, symbol: str, days: int) -> MarketData:
        end = int(time.time())
        start = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())
        params = {
            "period1": start,
            "period2": end,
            "interval": "1d",
            "includeAdjustedClose": "true",
            "events": "div,split",
        }
        errors: list[str] = []
        payload = None
        url = ""
        for host in self.hosts:
            url = f"https://{host}/v8/finance/chart/{symbol}"
            try:
                payload = json.loads(_http_get(url, params=params))
                break
            except SourceError as exc:
                errors.append(f"{host}: {exc}")
        if payload is None:
            raise SourceError(" / ".join(errors))

        chart = payload.get("chart") or {}
        if chart.get("error"):
            raise SourceError(f"Yahoo devolvió error: {chart['error']}")
        results = chart.get("result") or []
        if not results:
            raise SourceError(f"Yahoo no tiene serie para «{symbol}».")

        result = results[0]
        timestamps = result.get("timestamp") or []
        if not timestamps:
            raise SourceError(f"Yahoo devolvió una serie vacía para «{symbol}».")

        quote = (result.get("indicators", {}).get("quote") or [{}])[0]
        data = {
            "open": quote.get("open"),
            "high": quote.get("high"),
            "low": quote.get("low"),
            "close": quote.get("close"),
            "volume": quote.get("volume"),
        }
        adj = result.get("indicators", {}).get("adjclose") or []
        if adj and adj[0].get("adjclose"):
            data["adj_close"] = adj[0]["adjclose"]

        index = pd.to_datetime(pd.Series(timestamps), unit="s", utc=True)
        frame = pd.DataFrame(
            {k: v for k, v in data.items() if v is not None},
            index=index.dt.tz_convert("UTC").dt.tz_localize(None).dt.normalize(),
        )
        frame = _apply_adjustment(frame)

        meta = result.get("meta", {})
        return MarketData(
            symbol=symbol.upper(),
            frame=frame,
            source=self.name,
            source_url=f"{url}?interval=1d",
            retrieved_at=utcnow(),
            currency=meta.get("currency"),
            exchange=meta.get("fullExchangeName") or meta.get("exchangeName"),
            asset_class=(meta.get("instrumentType") or "").lower() or None,
            long_name=meta.get("longName") or meta.get("shortName"),
        )


# --------------------------------------------------------------------- Stooq
class StooqSource(DataSource):
    """Stooq: CSV público, sin llave. Respaldo cuando Yahoo no responde.

    No entrega precio ajustado, así que la calidad se marca más baja.
    """

    name = "stooq"

    @staticmethod
    def map_symbol(symbol: str) -> str:
        sym = symbol.strip().lower()
        if sym.startswith("^"):
            return sym.replace("^gspc", "^spx").replace("^ixic", "^ndq")
        if sym.endswith("-usd"):
            return sym.replace("-usd", "usd")
        if "." in sym:
            return sym
        return f"{sym}.us"

    def fetch(self, symbol: str, days: int) -> MarketData:
        mapped = self.map_symbol(symbol)
        url = "https://stooq.com/q/d/l/"
        text = _http_get(url, params={"s": mapped, "i": "d"})
        if not text or text.lower().startswith("no data"):
            raise SourceError(f"Stooq no tiene serie para «{symbol}» (buscado como {mapped}).")
        rows = list(csv.DictReader(io.StringIO(text)))
        if not rows:
            raise SourceError(f"Stooq devolvió un CSV vacío para «{symbol}».")
        frame = pd.DataFrame(rows)
        # Si alguna fila trae más campos que el encabezado, `DictReader` los
        # mete bajo la clave `None` (restkey) y pandas la vuelve `nan` — un
        # float, no un string — al construir las columnas. `str(c)` la
        # convierte en la columna inofensiva "nan" en vez de tronar aquí.
        frame.columns = [str(c).strip().lower() for c in frame.columns]
        if "date" not in frame.columns or "close" not in frame.columns:
            raise SourceError("El CSV de Stooq no trae las columnas esperadas.")
        frame = frame.set_index(pd.to_datetime(frame["date"]))
        keep = [c for c in ("open", "high", "low", "close", "volume") if c in frame.columns]
        frame = frame[keep].apply(pd.to_numeric, errors="coerce")
        cutoff = pd.Timestamp.utcnow().tz_localize(None).normalize() - pd.Timedelta(days=days)
        frame = frame[frame.index >= cutoff]
        frame = _apply_adjustment(frame)
        return MarketData(
            symbol=symbol.upper(),
            frame=frame,
            source=self.name,
            source_url=f"{url}?s={mapped}&i=d",
            retrieved_at=utcnow(),
            notes=["Stooq no entrega precio ajustado por dividendos."],
        )


# -------------------------------------------------------------- Alpha Vantage
class AlphaVantageSource(DataSource):
    """Alpha Vantage. Requiere llave gratuita en `RITCHIE_ALPHAVANTAGE_KEY`."""

    name = "alpha_vantage"

    def fetch(self, symbol: str, days: int) -> MarketData:
        key = os.environ.get("RITCHIE_ALPHAVANTAGE_KEY", "").strip()
        if not key:
            raise SourceError("Falta la variable de entorno RITCHIE_ALPHAVANTAGE_KEY.")
        url = "https://www.alphavantage.co/query"
        params = {
            "function": "TIME_SERIES_DAILY_ADJUSTED",
            "symbol": symbol,
            "outputsize": "full",
            "apikey": key,
        }
        payload = json.loads(_http_get(url, params=params))
        series = payload.get("Time Series (Daily)")
        if series is None:
            note = payload.get("Note") or payload.get("Information") or payload.get("Error Message")
            raise SourceError(f"Alpha Vantage no entregó serie: {note or payload}")
        records = []
        for date, values in series.items():
            records.append(
                {
                    "date": date,
                    "open": values.get("1. open"),
                    "high": values.get("2. high"),
                    "low": values.get("3. low"),
                    "close": values.get("4. close"),
                    "adj_close": values.get("5. adjusted close"),
                    "volume": values.get("6. volume"),
                }
            )
        frame = pd.DataFrame(records).set_index("date")
        frame.index = pd.to_datetime(frame.index)
        frame = frame.apply(pd.to_numeric, errors="coerce").sort_index()
        cutoff = pd.Timestamp.utcnow().tz_localize(None).normalize() - pd.Timedelta(days=days)
        frame = frame[frame.index >= cutoff]
        frame = _apply_adjustment(frame)
        return MarketData(
            symbol=symbol.upper(),
            frame=frame,
            source=self.name,
            source_url=url,
            retrieved_at=utcnow(),
        )


def parse_ohlc_frame(raw: pd.DataFrame, *, label: str) -> pd.DataFrame:
    """Normaliza un DataFrame crudo (columnas en cualquier orden, en
    español o inglés) a lo que el motor espera. La comparten `CsvSource`
    (un archivo local) y el apartado de "subir tus datos" del servidor —
    misma tolerancia de formato en los dos casos.
    """
    frame = raw.copy()
    frame.columns = [str(c).strip().lower().replace(" ", "_") for c in frame.columns]
    date_column = next((c for c in ("date", "fecha", "timestamp") if c in frame.columns), None)
    if date_column is None:
        raise SourceError(f"{label}: falta la columna de fecha (date/fecha/timestamp).")
    rename = {
        "adjclose": "adj_close",
        "adj close": "adj_close",
        "cierre": "close",
        "apertura": "open",
        "maximo": "high",
        "minimo": "low",
        "volumen": "volume",
    }
    frame = frame.rename(columns=rename)
    if "close" not in frame.columns:
        raise SourceError(f"{label}: falta la columna de cierre (close/cierre).")
    frame = frame.set_index(pd.to_datetime(frame[date_column]))
    keep = [c for c in ("open", "high", "low", "close", "adj_close", "volume") if c in frame.columns]
    frame = frame[keep].apply(pd.to_numeric, errors="coerce").sort_index()
    for column in ("open", "high", "low"):
        if column not in frame.columns:
            frame[column] = frame["close"]
    return frame


# ----------------------------------------------------------------------- CSV
class CsvSource(DataSource):
    """Archivo local con columnas date/open/high/low/close[/adj_close/volume].

    Permite analizar mercados sin API pública (BIVA, BMV, datos del bróker)
    exportando el histórico a CSV.
    """

    name = "csv"
    requires_network = False

    def __init__(self, directory: str | None = None):
        self.directory = directory or os.environ.get("RITCHIE_CSV_DIR", "")

    def _resolve(self, symbol: str) -> str:
        if os.path.isfile(symbol):
            return symbol
        if not self.directory:
            raise SourceError("No hay carpeta de CSV configurada (RITCHIE_CSV_DIR).")
        for candidate in (f"{symbol}.csv", f"{symbol.upper()}.csv", f"{symbol.lower()}.csv"):
            path = os.path.join(self.directory, candidate)
            if os.path.isfile(path):
                return path
        raise SourceError(f"No se encontró un CSV para «{symbol}» en {self.directory}.")

    def fetch(self, symbol: str, days: int) -> MarketData:
        path = self._resolve(symbol)
        frame = parse_ohlc_frame(pd.read_csv(path), label=path)
        frame = _apply_adjustment(frame)
        return MarketData(
            symbol=symbol.upper(),
            frame=frame,
            source=self.name,
            source_url=f"file://{os.path.abspath(path)}",
            retrieved_at=utcnow(),
            notes=[f"Datos locales de {os.path.basename(path)}."],
        )


# ----------------------------------------------------------------- Sintético
class SyntheticSource(DataSource):
    """Serie simulada, SIEMPRE marcada como sintética.

    Existe para dos cosas y ninguna más: probar el motor de punta a punta sin
    red, y permitir una demostración honesta de la interfaz. Toda respuesta
    construida sobre esta fuente viaja con `is_synthetic=True` y la interfaz
    lo muestra en grande. Jamás se presenta como mercado real.
    """

    name = "synthetic_test_fixture"
    requires_network = False
    kind = "garch"
    description = "serie simulada con agrupamiento de volatilidad y saltos"

    def __init__(self, seed: int | None = None):
        self.seed = seed

    def _frame(self, sessions: int, seed: int) -> pd.DataFrame:
        return synthetic.garch_series(sessions, seed)

    def fetch(self, symbol: str, days: int) -> MarketData:
        seed = self.seed if self.seed is not None else synthetic.stable_seed(symbol)
        sessions = max(300, int(days * 252 / 365))
        frame = _apply_adjustment(self._frame(sessions, seed))
        return MarketData(
            symbol=symbol.upper(),
            frame=frame,
            source=self.name,
            source_url=None,
            retrieved_at=utcnow(),
            currency="USD",
            asset_class="synthetic",
            long_name=f"{symbol.upper()} (serie simulada, no es mercado real)",
            is_synthetic=True,
            notes=[
                f"DATOS SIMULADOS: {self.description}. "
                "No corresponden a ningún mercado real y no sirven para decidir nada."
            ],
        )


class SyntheticPatternSource(SyntheticSource):
    """Serie simulada que SÍ contiene una ventaja estadística real.

    Se usa para la demostración y para probar que el motor detecta un patrón
    cuando existe. Sigue siendo simulada y se anuncia como tal.
    """

    name = "synthetic_demo_pattern"
    kind = "pattern"
    description = (
        "serie simulada con un patrón de reversión incrustado a propósito "
        "(después de una caída fuerte, el día siguiente tiende a rebotar)"
    )

    def _frame(self, sessions: int, seed: int) -> pd.DataFrame:
        return synthetic.pattern_series(sessions, seed)


class SyntheticNoiseSource(SyntheticSource):
    """Paseo aleatorio puro: la prueba de que el motor sabe decir que no hay nada."""

    name = "synthetic_random_walk"
    kind = "noise"
    description = "paseo aleatorio puro, sin ningún patrón que descubrir"

    def _frame(self, sessions: int, seed: int) -> pd.DataFrame:
        return synthetic.random_walk(sessions, seed)


#: Orden por defecto en que se intentan las fuentes reales.
DEFAULT_SOURCE_ORDER = ("yahoo_finance", "stooq", "alpha_vantage", "csv")

_REGISTRY: dict[str, type[DataSource]] = {
    YahooFinanceSource.name: YahooFinanceSource,
    StooqSource.name: StooqSource,
    AlphaVantageSource.name: AlphaVantageSource,
    CsvSource.name: CsvSource,
    SyntheticSource.name: SyntheticSource,
    SyntheticPatternSource.name: SyntheticPatternSource,
    SyntheticNoiseSource.name: SyntheticNoiseSource,
}


def build_source(name: str) -> DataSource:
    if name == "supabase_store":
        # Import perezoso: `supabase_store` importa de este módulo, así que
        # importarlo arriba crearía un ciclo. Solo se necesita si alguien
        # de verdad pide esta fuente (configurada o no).
        from .supabase_store import SupabaseStoreSource

        return SupabaseStoreSource()
    if name not in _REGISTRY:
        raise SourceError(f"Fuente desconocida: {name}. Disponibles: {sorted(_REGISTRY)}")
    return _REGISTRY[name]()


def available_sources() -> list[str]:
    return sorted(_REGISTRY)
