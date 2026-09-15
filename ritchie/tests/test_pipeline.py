"""Pruebas del recorrido completo, de la pregunta a la respuesta."""

from __future__ import annotations

import json

import pytest

from ritchie import Ritchie, config_for_profile
from ritchie.config import DecisionConfig, RitchieConfig, SimulationConfig, ValidationConfig
from ritchie.features import TargetSpec

RAPIDA = RitchieConfig(
    seed=13,
    validation=ValidationConfig(min_train=400, refit_every=150, final_test_fraction=0.25),
    decision=DecisionConfig(),
    simulation=SimulationConfig(n_paths=4000),
    profile="rapido",
)


def _motor(fuente: str) -> Ritchie:
    return Ritchie(
        config=RAPIDA, allow_synthetic=True, use_result_cache=False, source_order=(fuente,)
    )


@pytest.fixture(scope="module")
def respuesta_con_patron():
    resultado = _motor("synthetic_demo_pattern").ask(
        "¿Qué probabilidad hay de que DEMO suba 4% mañana?"
    )
    assert resultado.ok
    return resultado.payload


@pytest.fixture(scope="module")
def respuesta_ruido():
    resultado = _motor("synthetic_random_walk").ask(
        "¿Qué probabilidad hay de que RUIDO suba 4% mañana?"
    )
    assert resultado.ok
    return resultado.payload


@pytest.mark.lento
def test_la_respuesta_trae_los_cinco_niveles(respuesta_con_patron):
    for clave in (
        "resumen", "nivel_2_factores", "nivel_3_estadisticas",
        "nivel_4_metodologia", "nivel_5_tecnico",
    ):
        assert clave in respuesta_con_patron, clave


@pytest.mark.lento
def test_la_pantalla_principal_tiene_todo_lo_que_pide_el_spec(respuesta_con_patron):
    resumen = respuesta_con_patron["resumen"]
    for clave in (
        "probabilidad", "probabilidad_contraria", "tasa_base_historica", "confianza",
        "titular", "explicacion_simple", "explicacion_para_cualquiera", "factores",
        "advertencia", "hay_senal",
    ):
        assert clave in resumen, clave
    assert respuesta_con_patron["activo"]["precio_actual"] > 0
    assert respuesta_con_patron["grafica_precio"]
    assert respuesta_con_patron["escenarios"]["cono"]


@pytest.mark.lento
def test_encuentra_la_ventaja_en_la_serie_con_patron(respuesta_con_patron):
    resumen = respuesta_con_patron["resumen"]
    assert resumen["hay_senal"] is True, respuesta_con_patron["senal"]["bloqueos"]
    assert resumen["modelo_elegido"] is not None
    assert 0 < resumen["probabilidad"] < 1
    realidad = respuesta_con_patron["nivel_4_metodologia"]["prueba_de_realidad"]
    assert realidad["p_valor"] < 0.05


@pytest.mark.lento
def test_dice_que_no_hay_senal_en_el_ruido(respuesta_ruido):
    resumen = respuesta_ruido["resumen"]
    assert resumen["hay_senal"] is False
    assert resumen["probabilidad"] is None
    assert respuesta_ruido["senal"]["mensaje"]
    assert respuesta_ruido["senal"]["bloqueos"]
    # Aun sin señal, sigue entregando lo que sí es sólido.
    assert respuesta_ruido["escenarios"]["percentiles_precio"]
    assert resumen["tasa_base_historica"] is not None


@pytest.mark.lento
def test_la_auditoria_corre_y_aprueba(respuesta_con_patron):
    auditoria = respuesta_con_patron["nivel_5_tecnico"]["auditoria"]
    assert auditoria["aprobada"] is True, auditoria["fallas_criticas"]
    assert len(auditoria["pruebas"]) >= 9


@pytest.mark.lento
def test_la_respuesta_es_reproducible(respuesta_con_patron):
    repetida = _motor("synthetic_demo_pattern").ask(
        "¿Qué probabilidad hay de que DEMO suba 4% mañana?"
    ).payload
    assert repetida["resumen"]["probabilidad"] == respuesta_con_patron["resumen"]["probabilidad"]
    assert repetida["resumen"]["modelo_elegido"] == respuesta_con_patron["resumen"]["modelo_elegido"]
    assert (
        repetida["nivel_5_tecnico"]["reproducibilidad"]["huella_datos"]
        == respuesta_con_patron["nivel_5_tecnico"]["reproducibilidad"]["huella_datos"]
    )


@pytest.mark.lento
def test_la_procedencia_queda_registrada(respuesta_con_patron):
    procedencia = respuesta_con_patron["nivel_5_tecnico"]["procedencia"]["primary"]
    for clave in ("source", "retrieved_at", "first_date", "last_date", "rows"):
        assert procedencia[clave] is not None
    repro = respuesta_con_patron["nivel_5_tecnico"]["reproducibilidad"]
    for clave in ("version_motor", "semilla", "huella_datos", "objetivo", "momento_del_analisis"):
        assert repro[clave] is not None


@pytest.mark.lento
def test_los_datos_simulados_se_anuncian(respuesta_con_patron):
    assert respuesta_con_patron["simulacion"]["activa"] is True
    assert respuesta_con_patron["activo"]["es_simulado"] is True
    assert "SIMULACIÓN" in respuesta_con_patron["resumen"]["titular"]
    assert any("SIMULAD" in l.upper() for l in respuesta_con_patron["limitaciones"])


@pytest.mark.lento
def test_las_limitaciones_se_declaran(respuesta_con_patron):
    limitaciones = respuesta_con_patron["limitaciones"]
    assert len(limitaciones) >= 4
    assert any("noticias" in l for l in limitaciones)


@pytest.mark.lento
def test_la_respuesta_es_serializable_a_json(respuesta_con_patron):
    texto = json.dumps(respuesta_con_patron, ensure_ascii=False, default=str)
    assert len(texto) > 5000
    assert json.loads(texto)["resumen"]["titular"]


@pytest.mark.lento
def test_el_backtest_compara_contra_las_referencias(respuesta_con_patron):
    backtest = respuesta_con_patron["nivel_3_estadisticas"]["backtest"]
    if not backtest.get("disponible"):
        pytest.skip("no hubo modelo con predicciones suficientes")
    nombres = {b["estrategia"] for b in backtest["referencias"]}
    assert nombres == {"comprar_y_mantener", "operar_siempre", "señal_al_azar"}
    assert backtest["veredicto"]


@pytest.mark.lento
def test_horizontes_distintos_dan_respuestas_distintas():
    motor = _motor("synthetic_demo_pattern")
    corto = motor.analyze("DEMO", TargetSpec(1, 0.04, "up", "close")).payload
    largo = motor.analyze("DEMO", TargetSpec(10, 0.04, "up", "close")).payload
    ancho = lambda p: (  # noqa: E731
        p["escenarios"]["percentiles_rendimiento"]["p90"]
        - p["escenarios"]["percentiles_rendimiento"]["p10"]
    )
    assert ancho(largo) > ancho(corto)
    assert largo["objetivo"]["horizon"] == 10


def test_sin_datos_reales_la_respuesta_lo_dice():
    motor = Ritchie(config=RAPIDA, allow_synthetic=False, use_result_cache=False, source_order=("csv",))
    resultado = motor.ask("¿ZZQQXX sube 4% mañana?")
    assert resultado.ok is False
    assert resultado.error == "data_unavailable"
    assert "no inventa" in resultado.payload["mensaje"]
    assert resultado.payload["motivos"]


def test_sin_simbolo_pide_aclaracion():
    motor = _motor("synthetic_demo_pattern")
    resultado = motor.ask("¿qué va a pasar mañana?")
    assert resultado.ok is False
    assert resultado.error == "no_symbol"
    assert resultado.payload["aclaraciones"]


def test_el_perfil_cambia_el_costo_no_el_protocolo():
    rapido = config_for_profile("rapido")
    completo = config_for_profile("completo")
    assert rapido.validation.refit_every > completo.validation.refit_every
    assert rapido.validation.min_train == completo.validation.min_train
    assert rapido.validation.final_test_fraction == completo.validation.final_test_fraction
