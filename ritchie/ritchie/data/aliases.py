"""Traducción de lo que escribe una persona al símbolo real del mercado."""

from __future__ import annotations

import re

#: Nombres coloquiales → símbolo. Solo atajos verificables, nunca adivinanzas.
NAME_TO_SYMBOL = {
    "apple": "AAPL", "manzana": "AAPL",
    "microsoft": "MSFT",
    "nvidia": "NVDA",
    "tesla": "TSLA",
    "amazon": "AMZN",
    "google": "GOOGL", "alphabet": "GOOGL",
    "meta": "META", "facebook": "META",
    "netflix": "NFLX",
    "marathon": "MARA", "marathon digital": "MARA",
    "riot": "RIOT",
    "coinbase": "COIN",
    "microstrategy": "MSTR", "strategy": "MSTR",
    "bitcoin": "BTC-USD", "btc": "BTC-USD",
    "ethereum": "ETH-USD", "eth": "ETH-USD",
    "solana": "SOL-USD",
    "oro": "GC=F", "gold": "GC=F",
    "plata": "SI=F", "silver": "SI=F",
    "petroleo": "CL=F", "petróleo": "CL=F", "crudo": "CL=F", "oil": "CL=F",
    "gas natural": "NG=F",
    "sp500": "^GSPC", "s&p": "^GSPC", "s&p500": "^GSPC", "sp 500": "^GSPC",
    "nasdaq": "^IXIC",
    "dow": "^DJI", "dow jones": "^DJI",
    "russell": "^RUT",
    "vix": "^VIX", "volatilidad": "^VIX",
    "ipc": "^MXX", "bolsa mexicana": "^MXX", "bmv": "^MXX",
    "dolar": "MXN=X", "dólar": "MXN=X", "peso": "MXN=X", "usdmxn": "MXN=X",
    "euro": "EURUSD=X",
}

#: Clasificación gruesa del instrumento a partir del símbolo.
_INDEX_PREFIX = "^"
_FUTURE_SUFFIX = "=F"
_FX_SUFFIX = "=X"
_CRYPTO_SUFFIX = "-USD"

#: Mercado de referencia sugerido por tipo de activo.
BENCHMARKS = {
    "crypto": "BTC-USD",
    "index": "^GSPC",
    "future": "^GSPC",
    "fx": "^GSPC",
    "equity": "^GSPC",
    "etf": "^GSPC",
    "unknown": "^GSPC",
}

#: Sector aproximado para un puñado de símbolos muy usados. Se emplea solo
#: para añadir una variable de contexto cuando existe; nunca se inventa.
SECTOR_PROXY = {
    "MARA": "BTC-USD", "RIOT": "BTC-USD", "CLSK": "BTC-USD", "HUT": "BTC-USD",
    "COIN": "BTC-USD", "MSTR": "BTC-USD", "BITF": "BTC-USD", "WULF": "BTC-USD",
    "AAPL": "XLK", "MSFT": "XLK", "NVDA": "SMH", "AMD": "SMH", "INTC": "SMH",
    "AVGO": "SMH", "MU": "SMH", "TSM": "SMH",
    "TSLA": "XLY", "AMZN": "XLY", "NFLX": "XLC", "META": "XLC", "GOOGL": "XLC",
    "JPM": "XLF", "BAC": "XLF", "GS": "XLF", "XOM": "XLE", "CVX": "XLE",
    "PFE": "XLV", "JNJ": "XLV", "UNH": "XLV",
}


def normalize_symbol(raw: str) -> str:
    """Convierte lo escrito por el usuario en un símbolo de mercado."""
    text = (raw or "").strip()
    if not text:
        return ""
    lowered = re.sub(r"\s+", " ", text.lower())
    if lowered in NAME_TO_SYMBOL:
        return NAME_TO_SYMBOL[lowered]
    cleaned = text.replace("$", "").strip()
    if re.fullmatch(r"[\^]?[A-Za-z0-9][A-Za-z0-9.\-=]{0,14}", cleaned):
        if cleaned.startswith("^") or "=" in cleaned:
            return cleaned.upper()
        return cleaned.upper()
    return cleaned.upper()


def guess_asset_class(symbol: str, declared: str | None = None) -> str:
    """Tipo de instrumento a partir del símbolo o de lo que dijo la fuente."""
    if declared:
        mapping = {
            "equity": "equity", "etf": "etf", "index": "index",
            "cryptocurrency": "crypto", "currency": "fx", "future": "future",
            "mutualfund": "etf", "synthetic": "synthetic",
        }
        if declared.lower() in mapping:
            return mapping[declared.lower()]
    sym = symbol.upper()
    if sym.startswith(_INDEX_PREFIX):
        return "index"
    if sym.endswith(_FUTURE_SUFFIX):
        return "future"
    if sym.endswith(_FX_SUFFIX):
        return "fx"
    if sym.endswith(_CRYPTO_SUFFIX):
        return "crypto"
    return "equity"


def companions_for(symbol: str, asset_class: str) -> dict[str, str]:
    """Series de contexto que vale la pena traer si la fuente las tiene."""
    sym = symbol.upper()
    companions: dict[str, str] = {}
    benchmark = BENCHMARKS.get(asset_class, "^GSPC")
    if benchmark != sym:
        companions["benchmark"] = benchmark
    if asset_class in ("equity", "etf", "index") and sym != "^VIX":
        companions["volatility_index"] = "^VIX"
    sector = SECTOR_PROXY.get(sym)
    if sector and sector != sym:
        companions["sector"] = sector
    return companions
