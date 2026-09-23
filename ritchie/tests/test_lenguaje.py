"""Pruebas del parser de preguntas en español."""

from __future__ import annotations

import pytest

from ritchie.nlq import parse


@pytest.mark.parametrize(
    "pregunta,simbolo,horizonte,umbral,direccion,modo",
    [
        ("¿Qué probabilidad hay de que MARA suba 4% mañana?", "MARA", 1, 0.04, "up", "close"),
        ("¿Qué podría pasar con AAPL durante los próximos 5 días?", "AAPL", 5, 0.04, "up", "close"),
        ("¿Cuál es el escenario más probable para TSLA en dos semanas?", "TSLA", 10, 0.04, "up", "close"),
        ("probabilidad de que bitcoin baje 10% en 3 días", "BTC-USD", 3, 0.10, "down", "close"),
        ("que tan probable es que el sp500 caiga 2 por ciento la próxima semana", "^GSPC", 5, 0.02, "down", "close"),
        ("¿NVDA toca 7% en algún momento de los próximos 10 días?", "NVDA", 10, 0.07, "up", "touch"),
        ("¿se queda entre +3% y -3% QQQ este mes?", "QQQ", 20, 0.03, "range", "close"),
        ("$msft pasado mañana", "MSFT", 2, 0.04, "up", "close"),
        ("analiza el oro", "GC=F", 1, 0.04, "up", "close"),
        ("SPY", "SPY", 1, 0.04, "up", "close"),
    ],
)
def test_interpretacion_de_preguntas(pregunta, simbolo, horizonte, umbral, direccion, modo):
    resultado = parse(pregunta)
    assert resultado.symbol == simbolo
    assert resultado.spec.horizon == horizonte
    assert resultado.spec.threshold == pytest.approx(umbral)
    assert resultado.spec.direction == direccion
    assert resultado.spec.mode == modo


def test_sin_activo_pide_aclaracion():
    resultado = parse("¿qué va a pasar mañana?")
    assert resultado.symbol is None
    assert resultado.clarifications
    assert not resultado.confident


def test_activo_por_defecto_se_respeta():
    assert parse("¿y mañana?", default_symbol="nvda").symbol == "NVDA"


def test_los_supuestos_se_declaran():
    resultado = parse("AAPL")
    assert any("plazo" in s for s in resultado.assumptions)
    assert any("%" in s for s in resultado.assumptions)


@pytest.mark.parametrize(
    "pregunta,intencion",
    [
        ("¿qué factores están influyendo en NVDA?", "factores"),
        ("¿qué podría pasar con SPY?", "escenarios"),
        ("¿entre qué precios se moverá AAPL?", "rango"),
        ("¿qué probabilidad hay de que MSFT suba?", "probabilidad"),
        ("¿cómo lo calculas para TSLA?", "metodologia"),
    ],
)
def test_deteccion_de_intencion(pregunta, intencion):
    assert parse(pregunta).intent == intencion


def test_horizonte_demasiado_largo_se_recorta():
    resultado = parse("¿AAPL sube 4% en 10 meses?")
    assert resultado.spec.horizon == 60
    assert resultado.clarifications


def test_movimiento_absurdo_se_cuestiona():
    resultado = parse("¿MARA sube 500% mañana?")
    assert resultado.clarifications


def test_palabras_comunes_no_se_confunden_con_tickers():
    for pregunta in ("¿QUE PASA MAÑANA?", "NO SE", "¿HAY ALGO?"):
        assert parse(pregunta).symbol is None


def test_reformulacion_es_legible():
    texto = parse("¿probabilidad de que MARA suba 4% mañana?").restated()
    assert "MARA" in texto and "4" in texto


def test_texto_vacio_no_rompe():
    resultado = parse("")
    assert resultado.symbol is None
    assert resultado.clarifications


def test_ambas_direcciones_gana_la_primera():
    assert parse("¿MARA sube o baja 4% mañana?").spec.direction == "up"
    assert parse("¿MARA baja o sube 4% mañana?").spec.direction == "down"


def test_acentos_y_mayusculas_son_indiferentes():
    a = parse("¿QUÉ PROBABILIDAD HAY DE QUE AAPL SUBA 4% MAÑANA?")
    b = parse("que probabilidad hay de que AAPL suba 4% manana")
    assert a.symbol == b.symbol == "AAPL"
    assert a.spec.horizon == b.spec.horizon == 1
