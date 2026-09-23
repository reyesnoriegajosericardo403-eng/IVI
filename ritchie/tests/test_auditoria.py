"""Pruebas de la auditoría automática, incluida su capacidad de cazar fugas."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ritchie.audit import run_audit
from ritchie.config import DecisionConfig, ValidationConfig
from ritchie.features import build_target
from ritchie.models import build_candidates
from ritchie.validation import run_walk_forward, select_model


@pytest.fixture(scope="module")
def auditoria(dataset, contexto, spec):
    modelos = build_candidates("rapido")
    walk = run_walk_forward(
        modelos, dataset["x"], dataset["y"], contexto,
        ValidationConfig(min_train=400, refit_every=150, final_test_fraction=0.25),
    )
    seleccion = select_model(
        walk.predictions, walk.y, walk.dev_mask,
        {m.name: m.family for m in modelos}, {m.name: m.purpose for m in modelos},
        DecisionConfig(), seed=13, horizon=1,
    )
    return {
        "reporte": run_audit(
            market=dataset["market"], features=dataset["matrix"].frame,
            target=build_target(dataset["market"], spec), x=dataset["x"], y=dataset["y"],
            walk=walk, selection=seleccion, spec=spec, ctx=contexto, companions={},
        ),
        "walk": walk, "seleccion": seleccion,
    }


def test_la_auditoria_aprueba_un_analisis_correcto(auditoria):
    reporte = auditoria["reporte"]
    assert reporte["aprobada"] is True, reporte["fallas_criticas"]
    assert not reporte["fallas_criticas"]


def test_todas_las_verificaciones_del_spec_estan_presentes(auditoria):
    claves = {p["clave"] for p in auditoria["reporte"]["pruebas"]}
    esperadas = {
        "indice_temporal", "causalidad", "alineacion_objetivo", "correlacion_sospechosa",
        "separacion_bloques", "probabilidades_validas", "calibrador", "sobreajuste", "calidad_datos",
    }
    assert esperadas.issubset(claves)


def test_cada_verificacion_explica_lo_que_midio(auditoria):
    for prueba in auditoria["reporte"]["pruebas"]:
        assert prueba["detalle"]
        assert prueba["resultado"] in ("correcto", "falla")


def test_la_auditoria_caza_una_fuga_de_informacion(dataset, contexto, spec, auditoria):
    """Se inyecta a propósito una variable que ve el futuro."""
    objetivo = build_target(dataset["market"], spec)
    x_envenenado = dataset["x"].copy()
    x_envenenado["variable_tramposa"] = dataset["y"].astype(float).to_numpy()
    reporte = run_audit(
        market=dataset["market"], features=dataset["matrix"].frame, target=objetivo,
        x=x_envenenado, y=dataset["y"], walk=auditoria["walk"], selection=auditoria["seleccion"],
        spec=spec, ctx=contexto, companions={},
    )
    fallas = {f["clave"] for f in reporte["fallas_criticas"]}
    assert "correlacion_sospechosa" in fallas
    assert reporte["aprobada"] is False


def test_la_auditoria_caza_un_objetivo_mal_alineado(dataset, contexto, spec, auditoria):
    """Se desplaza la etiqueta un día: debería detectarse."""
    objetivo_malo = build_target(dataset["market"], spec).shift(1)
    reporte = run_audit(
        market=dataset["market"], features=dataset["matrix"].frame, target=objetivo_malo,
        x=dataset["x"], y=dataset["y"], walk=auditoria["walk"], selection=auditoria["seleccion"],
        spec=spec, ctx=contexto, companions={},
    )
    alineacion = next(p for p in reporte["pruebas"] if p["clave"] == "alineacion_objetivo")
    assert alineacion["resultado"] == "falla"


def test_la_auditoria_caza_fechas_desordenadas(dataset, contexto, spec, auditoria):
    market = dataset["market"]
    revuelto = market.frame.copy()
    revuelto.index = revuelto.index[::-1]
    from ritchie.data.schema import MarketData

    dañado = MarketData(
        symbol=market.symbol, frame=revuelto, source=market.source,
        retrieved_at=market.retrieved_at, quality=market.quality, is_synthetic=True,
    )
    reporte = run_audit(
        market=dañado, features=dataset["matrix"].frame, target=build_target(market, spec),
        x=dataset["x"], y=dataset["y"], walk=auditoria["walk"], selection=auditoria["seleccion"],
        spec=spec, ctx=contexto, companions={},
    )
    indice = next(p for p in reporte["pruebas"] if p["clave"] == "indice_temporal")
    assert indice["resultado"] == "falla"


def test_la_prueba_de_causalidad_compara_muchos_valores(auditoria):
    causalidad = next(p for p in auditoria["reporte"]["pruebas"] if p["clave"] == "causalidad")
    assert causalidad["resultado"] == "correcto"
    assert causalidad["evidencia"]["comparaciones"] > 50
    assert not causalidad["evidencia"]["discrepancias"]
