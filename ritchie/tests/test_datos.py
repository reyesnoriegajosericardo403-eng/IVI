"""Pruebas de la capa de datos: procedencia, limpieza y honestidad."""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

from ritchie.data import DataUnavailable, MarketDataLoader
from ritchie.data.aliases import companions_for, guess_asset_class, normalize_symbol
from ritchie.data.quality import assess, normalize_frame
from ritchie.data.sources import SourceError, build_source
from ritchie.data.loader import align_companion


def _frame(dates, closes, **extra):
    data = {"open": closes, "high": [c * 1.01 for c in closes], "low": [c * 0.99 for c in closes],
            "close": closes}
    data.update(extra)
    return pd.DataFrame(data, index=pd.to_datetime(dates))


def test_normalize_elimina_duplicados_y_ordena():
    frame = _frame(["2024-01-03", "2024-01-02", "2024-01-02", "2024-01-04"], [10.0, 9.0, 9.5, 11.0])
    clean, stats = normalize_frame(frame)
    assert stats["duplicate_dates"] == 1
    assert list(clean.index) == sorted(clean.index)
    assert len(clean) == 3
    # Se conserva la última aparición de la fecha repetida.
    assert clean.loc[pd.Timestamp("2024-01-02"), "close"] == 9.5


def test_normalize_descarta_filas_sin_cierre_y_no_las_inventa():
    frame = _frame(["2024-01-02", "2024-01-03", "2024-01-04"], [10.0, np.nan, 12.0])
    clean, stats = normalize_frame(frame)
    assert stats["missing_close"] == 1
    assert len(clean) == 2
    assert not clean["close"].isna().any()
    # La fecha faltante simplemente no existe: nunca se rellena.
    assert pd.Timestamp("2024-01-03") not in clean.index


def test_normalize_descarta_precios_no_positivos():
    frame = _frame(["2024-01-02", "2024-01-03"], [10.0, 0.0])
    clean, _ = normalize_frame(frame)
    assert len(clean) == 1


def test_calidad_detecta_precio_congelado_y_movimientos_imposibles():
    dates = pd.bdate_range("2024-01-01", periods=40)
    closes = [10.0] * 10 + list(np.linspace(10, 12, 29)) + [40.0]
    frame = _frame(dates, closes)
    clean, stats = normalize_frame(frame)
    report = assess(clean, stats)
    assert report.stale_price_runs > 0
    assert report.extreme_moves >= 1
    assert report.score < 1.0
    assert report.issues


def test_calidad_marca_falta_de_volumen_y_ajuste():
    dates = pd.bdate_range("2024-01-01", periods=60)
    frame = _frame(dates, list(np.linspace(10, 12, 60)))
    clean, stats = normalize_frame(frame)
    report = assess(clean, stats)
    assert report.has_volume is False
    assert report.has_adjusted_close is False
    assert any("volumen" in issue for issue in report.issues)


def test_sin_fuentes_disponibles_lanza_data_unavailable():
    loader = MarketDataLoader(source_order=("csv",), use_cache=False, allow_synthetic=False)
    with pytest.raises(DataUnavailable) as error:
        loader.load("NO_EXISTE_JAMAS", days=365)
    assert error.value.reasons  # siempre explica por qué


def test_fuente_sintetica_viaja_marcada():
    data = build_source("synthetic_test_fixture").fetch("PRUEBA", 365 * 4)
    assert data.is_synthetic is True
    assert "SIMULADOS" in " ".join(data.notes).upper()
    assert data.provenance()["is_synthetic"] is True


def test_fuente_sintetica_es_determinista():
    a = build_source("synthetic_test_fixture").fetch("XYZ", 365 * 3)
    b = build_source("synthetic_test_fixture").fetch("XYZ", 365 * 3)
    assert np.allclose(a.frame["close"].to_numpy(), b.frame["close"].to_numpy())


def test_csv_sin_carpeta_falla_con_mensaje_claro():
    with pytest.raises(SourceError):
        build_source("csv").fetch("LOQUESEA", 365)


def test_coingecko_simbolo_desconocido_falla_sin_tocar_la_red(monkeypatch):
    import ritchie.data.sources as sources

    def _no_deberia_llamarse(*args, **kwargs):
        raise AssertionError("CoinGecko no debe llamar a la red para un símbolo que no cubre.")

    monkeypatch.setattr(sources, "_http_get", _no_deberia_llamarse)
    with pytest.raises(SourceError):
        build_source("coingecko").fetch("AAPL", 365)


def test_coingecko_parsea_precios_diarios(monkeypatch):
    import ritchie.data.sources as sources

    base = pd.Timestamp.utcnow().tz_localize(None).normalize().tz_localize("UTC") - pd.Timedelta(days=94)
    precios = [
        [int((base + pd.Timedelta(days=i)).timestamp() * 1000), 100.0 + i]
        for i in range(95)
    ]
    volumenes = [[ts, 1_000_000.0 + i] for i, (ts, _) in enumerate(precios)]
    payload = {"prices": precios, "total_volumes": volumenes}

    def _falso_http_get(url, params=None, headers=None, max_attempts=4):
        assert "coins/bitcoin/market_chart" in url
        return json.dumps(payload)

    monkeypatch.setattr(sources, "_http_get", _falso_http_get)
    data = build_source("coingecko").fetch("BTC-USD", 90)

    assert data.source == "coingecko"
    assert data.asset_class == "cryptocurrency"
    assert not data.frame.empty
    assert (data.frame["open"] == data.frame["close"]).all()
    assert (data.frame["high"] == data.frame["close"]).all()
    assert (data.frame["low"] == data.frame["close"]).all()
    # Se recorta al rango pedido (90 días), aunque a CoinGecko se le haya
    # pedido más para forzar granularidad diaria.
    assert (data.frame.index >= pd.Timestamp.utcnow().tz_localize(None).normalize() - pd.Timedelta(days=90)).all()


def test_procedencia_incluye_fuente_y_momento():
    data = build_source("synthetic_test_fixture").fetch("ABC", 365 * 3)
    provenance = data.provenance()
    for key in ("symbol", "source", "retrieved_at", "first_date", "last_date", "rows"):
        assert provenance[key] is not None


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("mara", "MARA"), ("$aapl", "AAPL"), ("bitcoin", "BTC-USD"),
        ("sp500", "^GSPC"), ("  nvda  ", "NVDA"), ("oro", "GC=F"),
    ],
)
def test_normalizacion_de_simbolos(entrada, esperado):
    assert normalize_symbol(entrada) == esperado


@pytest.mark.parametrize(
    "simbolo,clase",
    [("AAPL", "equity"), ("^GSPC", "index"), ("BTC-USD", "crypto"), ("GC=F", "future"), ("MXN=X", "fx")],
)
def test_clasificacion_de_activos(simbolo, clase):
    assert guess_asset_class(simbolo) == clase


def test_companeros_de_contexto_no_se_incluyen_a_si_mismos():
    companions = companions_for("^GSPC", "index")
    assert "^GSPC" not in companions.values()


def test_alineacion_de_contexto_nunca_usa_el_futuro():
    principal = _frame(pd.bdate_range("2024-01-01", periods=10), list(np.linspace(10, 11, 10)))
    contexto = _frame(
        pd.to_datetime(["2024-01-01", "2024-01-05", "2024-01-10"]), [100.0, 200.0, 300.0]
    )
    aligned = align_companion(principal, contexto)
    # El 2024-01-03 solo puede conocer el dato del 01, jamás el del 05.
    assert aligned.loc[pd.Timestamp("2024-01-03"), "close"] == 100.0
    assert aligned["close"].isna().sum() == 0 or aligned["close"].iloc[0] == 100.0
