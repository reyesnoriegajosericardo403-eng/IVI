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
    "gas natural": "NG=F", "natural gas": "NG=F",
    "cobre": "HG=F", "copper": "HG=F",
    "maiz": "ZC=F", "maíz": "ZC=F", "corn": "ZC=F",
    "trigo": "ZW=F", "wheat": "ZW=F",
    "soya": "ZS=F", "soybean": "ZS=F", "soja": "ZS=F",
    "cafe": "KC=F", "café": "KC=F", "coffee": "KC=F",
    "algodon": "CT=F", "algodón": "CT=F", "cotton": "CT=F",
    "azucar": "SB=F", "azúcar": "SB=F", "sugar": "SB=F",
    "sp500": "^GSPC", "s&p": "^GSPC", "s&p500": "^GSPC", "sp 500": "^GSPC",
    "futuro sp500": "ES=F", "futuro s&p500": "ES=F", "futuro del sp500": "ES=F",
    "futuro del s&p500": "ES=F", "futuro del s&p 500": "ES=F",
    "nasdaq": "^IXIC",
    "futuro nasdaq": "NQ=F", "futuro del nasdaq": "NQ=F",
    "dow": "^DJI", "dow jones": "^DJI",
    "futuro dow": "YM=F", "futuro del dow": "YM=F",
    "russell": "^RUT",
    "vix": "^VIX", "volatilidad": "^VIX",
    "ipc": "^MXX", "bolsa mexicana": "^MXX", "bmv": "^MXX",
    "dolar": "MXN=X", "dólar": "MXN=X", "peso": "MXN=X", "usdmxn": "MXN=X",
    "euro": "EURUSD=X",
    "libra": "GBPUSD=X", "libra esterlina": "GBPUSD=X",
    "yen": "JPYUSD=X", "yen japones": "JPYUSD=X", "yen japonés": "JPYUSD=X",
    "yuan": "CNYUSD=X", "yuan chino": "CNYUSD=X",
    # ---------------------------------------------------- bonos gubernamentales
    # Rendimientos del Tesoro de EE. UU. (lo que cotiza Yahoo Finance como
    # índice, no como precio de un bono individual): sirven para preguntar
    # por "el bono a 10 años" igual que por una acción.
    "bono a 10 años": "^TNX", "bono del tesoro a 10 años": "^TNX",
    "treasury 10 años": "^TNX", "t-note": "^TNX", "tnote": "^TNX",
    "bono a 30 años": "^TYX", "bono del tesoro a 30 años": "^TYX", "t-bond": "^TYX",
    "bono a 5 años": "^FVX", "bono del tesoro a 5 años": "^FVX",
    "letras del tesoro": "^IRX", "t-bills": "^IRX", "cetes de eu": "^IRX",
    # ETFs de renta fija: la forma práctica de "invertir en bonos" y la que
    # más gente reconoce (TLT, IEF, etc.) — sí tienen precio e historia real.
    "bonos del tesoro largo plazo": "TLT", "bonos largo plazo": "TLT",
    "bonos del tesoro mediano plazo": "IEF", "bonos mediano plazo": "IEF",
    "bonos del tesoro corto plazo": "SHY", "bonos corto plazo": "SHY",
    "bonos agregados": "AGG", "mercado de bonos": "BND",
    "bonos corporativos": "LQD", "bonos de alto rendimiento": "HYG",
    "bonos basura": "HYG", "bonos high yield": "HYG",
    "bonos del gobierno mexicano": "MXN=X",
}

#: Símbolos de rendimientos del Tesoro (no tienen "precio" de mercado en el
#: sentido normal: cotizan en puntos porcentuales). El motor los trata igual
#: que cualquier serie de precio, pero la interfaz debe llamarlos por su
#: nombre correcto en vez de "acción" o "precio de cierre".
TREASURY_YIELD_SYMBOLS = {"^TNX", "^TYX", "^FVX", "^IRX"}

#: ETFs de renta fija muy usados — mismo tratamiento de datos que cualquier
#: ETF, pero clasificados como "bond" para que la explicación en pantalla
#: diga "bono"/"renta fija" en vez de "acción".
BOND_ETF_SYMBOLS = {"TLT", "IEF", "SHY", "IEI", "AGG", "BND", "LQD", "HYG", "GOVT", "SHV", "MUB"}

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
    "bond": "^TNX",
    "bond_yield": "^TNX",
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
    if sym in TREASURY_YIELD_SYMBOLS:
        return "bond_yield"
    if sym in BOND_ETF_SYMBOLS:
        return "bond"
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
