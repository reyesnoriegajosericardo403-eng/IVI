"""Entender la pregunta escrita en español.

Convierte "¿qué probabilidad hay de que MARA suba 4% mañana?" en los
parámetros exactos del motor: símbolo, dirección, umbral, horizonte y modo.

Es un parser determinista, no un modelo de lenguaje. Dos razones: funciona sin
conexión y sin llaves de API, y sobre todo **no puede alucinar**. Si no
entiende algo, lo dice y pregunta, en vez de suponer.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from .data.aliases import NAME_TO_SYMBOL, normalize_symbol
from .features.targets import TargetSpec

#: Palabras que nunca son un símbolo, aunque vengan en mayúsculas. Sin esta
#: lista, "¿QUE PASA MAÑANA?" se interpretaría como el ticker «PASA».
_COMUNES = """
que como cual cuanto cuando donde quien porque pues si no ni o u y e
el la los las un una unos unas de del al a ante bajo con contra desde durante
en entre hacia hasta para por segun sin sobre tras mediante
es son era eran ser sea fue fueron hay habia haber estar esta estan estaba
tiene tienen tener tuvo puede pueden podria podrian va van ir vaya
pasa pasar pase pasara paso pasado sucede suceder ocurre ocurrir
sube subir suba suban subida baja bajar baje bajen bajada cae caer caiga
gana ganar pierde perder llega llegar toca tocar queda quedar mantener
me te se le lo nos os les mi tu su sus mis tus nuestro vuestro
esto eso aquello este ese aquel esta esa aquella algo alguien nada nadie
todo todos toda todas mucho muchos poco pocos mas menos muy tan tanto
hoy ayer manana ahora luego despues antes siempre nunca ya aun todavia
bien mal mejor peor grande chico alto bajo nuevo viejo
dia dias semana semanas mes meses ano anos sesion sesiones jornada jornadas
precio precios valor valores mercado mercados accion acciones bolsa
probabilidad probable posible escenario escenarios factor factores rango
analiza analizar analisis dime dame quiero saber pregunta respuesta
ritchie gracias hola ok vale pero aunque
usd mxn eur gbp jpy pesos dolares euros
""".split()

NOT_TICKERS = {word.upper() for word in _COMUNES}

#: Números escritos con letra que aparecen en horizontes.
WORD_NUMBERS = {
    "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10, "once": 11,
    "doce": 12, "quince": 15, "veinte": 20, "treinta": 30,
}

#: Horizonte máximo aceptado, en sesiones.
MAX_HORIZON = 60


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


@dataclass
class ParsedQuestion:
    """La pregunta, ya traducida a parámetros del motor."""

    raw: str
    symbol: str | None
    spec: TargetSpec
    intent: str = "probabilidad"
    confident: bool = True
    assumptions: list[str] = field(default_factory=list)
    clarifications: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "pregunta": self.raw,
            "simbolo": self.symbol,
            "objetivo": self.spec.to_dict(),
            "intencion": self.intent,
            "interpretacion_segura": self.confident,
            "supuestos": list(self.assumptions),
            "aclaraciones": list(self.clarifications),
        }

    def restated(self) -> str:
        """Cómo entendió RITCHIE la pregunta, para que el usuario lo verifique."""
        if not self.symbol:
            return "No identifiqué de qué activo me estás hablando."
        return f"Entendí: para {self.symbol}, ¿qué probabilidad hay de {self.spec.describe()}?"


# ------------------------------------------------------------------ símbolo
def extract_symbol(text: str) -> tuple[str | None, list[str]]:
    """Encuentra el activo. Devuelve el símbolo y las notas del proceso."""
    notes: list[str] = []

    cashtag = re.search(r"\$([A-Za-z][A-Za-z0-9.\-]{0,9})", text)
    if cashtag:
        return normalize_symbol(cashtag.group(1)), notes

    # Símbolos con forma inequívoca: ^GSPC, BTC-USD, GC=F, MXN=X.
    special = re.search(r"(\^[A-Za-z]{2,6}|[A-Za-z]{2,5}-USD|[A-Za-z]{1,4}=[FX])", text)
    if special:
        return normalize_symbol(special.group(1)), notes

    lowered = _strip_accents(text.lower())
    for name in sorted(NAME_TO_SYMBOL, key=len, reverse=True):
        pattern = r"\b" + re.escape(_strip_accents(name)) + r"\b"
        if re.search(pattern, lowered):
            symbol = NAME_TO_SYMBOL[name]
            notes.append(f'Interpreté «{name}» como {symbol}.')
            return symbol, notes

    for token in re.findall(r"\b[A-Z][A-Z0-9]{0,9}\b", text):
        if len(token) < 2:
            continue
        if _strip_accents(token).upper() in NOT_TICKERS:
            continue
        return normalize_symbol(token), notes

    return None, notes


# ----------------------------------------------------------------- horizonte
def extract_horizon(text: str) -> tuple[int, str | None]:
    """Devuelve el horizonte en sesiones y el texto que lo originó."""
    lowered = _strip_accents(text.lower())

    if re.search(r"\bpasado\s+manana\b", lowered):
        return 2, "pasado mañana"
    if re.search(r"\bmanana\b|\bproxima\s+sesion\b|\bsiguiente\s+sesion\b|\bel\s+dia\s+siguiente\b", lowered):
        return 1, "mañana"

    number_pattern = r"(\d+|" + "|".join(WORD_NUMBERS) + r")"

    match = re.search(number_pattern + r"\s*(sesiones|sesion|dias|dia|jornadas)", lowered)
    if match:
        return _to_number(match.group(1)), match.group(0)

    match = re.search(number_pattern + r"\s*(semanas|semana)", lowered)
    if match:
        return _to_number(match.group(1)) * 5, match.group(0)

    match = re.search(number_pattern + r"\s*(meses|mes)", lowered)
    if match:
        return _to_number(match.group(1)) * 20, match.group(0)

    if re.search(r"\b(proxima|siguiente)\s+semana\b|\besta\s+semana\b", lowered):
        return 5, "la próxima semana"
    if re.search(r"\b(proximo|siguiente|este)\s+mes\b|\ben\s+un\s+mes\b", lowered):
        return 20, "un mes"
    if re.search(r"\bquincena\b|\bquince\s+dias\b", lowered):
        return 10, "una quincena"
    if re.search(r"\bcorto\s+plazo\b", lowered):
        return 5, "el corto plazo"

    return 1, None


def _to_number(token: str) -> int:
    if token.isdigit():
        return int(token)
    return WORD_NUMBERS.get(token, 1)


# -------------------------------------------------------------------- umbral
def extract_threshold(text: str) -> tuple[float | None, str | None]:
    lowered = _strip_accents(text.lower())
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:%|por\s*ciento|porciento|puntos\s*porcentuales)", lowered)
    if match:
        value = float(match.group(1).replace(",", "."))
        return value / 100.0, match.group(0)
    return None, None


# ----------------------------------------------------------------- dirección
UP_WORDS = r"\b(sub[ae]|subir|suba|suban|alza|alcista|arriba|gan[ae]|crec|repunt|rebote|rebot)"
DOWN_WORDS = r"\b(baj[ae]|bajar|baje|caig|caer|caida|desplome|derrumb|abajo|pierd|perder|bajista|correc)"
RANGE_WORDS = r"\b(rango|lateral|se\s+quede|mantenga|permanezca|estable|entre)"
TOUCH_WORDS = (
    r"\b(en\s+alg[uú]n\s+momento|en\s+cualquier\s+momento|toque|toca|tocar|"
    r"llegue\s+a|llega\s+a|alcance|alcanza|intrad[ií]a)"
)


def extract_direction(text: str) -> tuple[str, str | None]:
    lowered = _strip_accents(text.lower())
    if re.search(_strip_accents(RANGE_WORDS), lowered):
        return "range", "rango"
    up = re.search(_strip_accents(UP_WORDS), lowered)
    down = re.search(_strip_accents(DOWN_WORDS), lowered)
    if up and down:
        return ("up", "subida") if up.start() < down.start() else ("down", "bajada")
    if down:
        return "down", "bajada"
    if up:
        return "up", "subida"
    return "up", None


def extract_mode(text: str) -> str:
    lowered = _strip_accents(text.lower())
    if re.search(_strip_accents(TOUCH_WORDS), lowered):
        return "touch"
    if re.search(r"\bal\s+cierre\b|\btermine\b|\bcierre\s+en\b", lowered):
        return "close"
    return "close"


# ------------------------------------------------------------------ intención
def extract_intent(text: str) -> str:
    lowered = _strip_accents(text.lower())
    if re.search(r"\bfactores?\b|\bpor\s+que\b|\bque\s+influye\b|\bque\s+esta\s+pasando\b", lowered):
        return "factores"
    if re.search(r"\brango\b|\bentre\s+que\s+precios\b|\bhasta\s+cuanto\b|\bque\s+precio\b", lowered):
        return "rango"
    if re.search(r"\bescenario\b|\bque\s+podria\s+pasar\b|\bque\s+puede\s+pasar\b|\bque\s+esperar\b", lowered):
        return "escenarios"
    if re.search(r"\bmetodolog|\bcomo\s+lo\s+calcul|\bque\s+modelo", lowered):
        return "metodologia"
    return "probabilidad"


# ------------------------------------------------------------------- público
def parse(
    question: str,
    default_threshold: float = 0.04,
    default_symbol: str | None = None,
) -> ParsedQuestion:
    """Traduce la pregunta a parámetros. Nunca adivina en silencio."""
    text = (question or "").strip()
    assumptions: list[str] = []
    clarifications: list[str] = []

    symbol, notes = extract_symbol(text)
    assumptions.extend(notes)
    if symbol is None and default_symbol:
        symbol = normalize_symbol(default_symbol)
    if symbol is None:
        clarifications.append(
            "¿De qué activo hablamos? Escribe su símbolo (por ejemplo MARA, AAPL o BTC-USD)."
        )

    horizon, horizon_text = extract_horizon(text)
    if horizon_text is None:
        assumptions.append("No especificaste plazo: asumí la próxima sesión.")
    if horizon > MAX_HORIZON:
        clarifications.append(
            f"El plazo pedido ({horizon} sesiones) es demasiado largo para este método; "
            f"se recortó a {MAX_HORIZON}."
        )
        horizon = MAX_HORIZON

    direction, direction_text = extract_direction(text)
    if direction_text is None and direction == "up":
        assumptions.append("No dijiste si hacia arriba o hacia abajo: asumí una subida.")

    threshold, threshold_text = extract_threshold(text)
    if threshold is None:
        threshold = default_threshold
        assumptions.append(
            f"No mencionaste de cuánto: asumí {default_threshold:.0%}."
        )
    if threshold > 0.9:
        clarifications.append(
            f"Un movimiento de {threshold:.0%} es enorme; revisa si eso es lo que querías preguntar."
        )

    intent = extract_intent(text)
    mode = extract_mode(text)
    if mode == "touch" and direction != "range":
        assumptions.append(
            "Entendí que preguntas si lo toca en algún momento, no solo al cierre."
        )

    spec = TargetSpec(horizon=horizon, threshold=threshold, direction=direction, mode=mode)
    return ParsedQuestion(
        raw=text,
        symbol=symbol,
        spec=spec,
        intent=intent,
        confident=not clarifications,
        assumptions=assumptions,
        clarifications=clarifications,
    )
