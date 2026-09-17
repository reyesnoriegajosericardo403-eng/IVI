"""Línea de comandos de RITCHIE.

    python -m ritchie servidor
    python -m ritchie preguntar "¿probabilidad de que MARA suba 4% mañana?"
    python -m ritchie analizar MARA --horizonte 5 --umbral 0.04
    python -m ritchie demo
"""

from __future__ import annotations

import argparse
import json
import sys

from .config import ENGINE_FULL_NAME, ENGINE_NAME, ENGINE_VERSION, config_for_profile
from .data.sources import DEFAULT_SOURCE_ORDER
from .features.targets import TargetSpec
from .pipeline import Ritchie


def _print_answer(payload: dict, full: bool = False) -> None:
    if full:
        print(json.dumps(payload, indent=2, ensure_ascii=False, default=str))
        return

    asset = payload.get("activo", {})
    summary = payload.get("resumen", {})
    print()
    print("=" * 72)
    name = asset.get("nombre") or asset.get("simbolo", "")
    print(f"  {asset.get('simbolo', '?')}  ·  {name}")
    if asset.get("precio_actual") is not None:
        print(f"  Precio: {asset['precio_actual']}  ({asset.get('fecha_ultimo_dato', '')})")
    if asset.get("es_simulado"):
        print("  *** DATOS SIMULADOS — NO ES UN MERCADO REAL ***")
    print("=" * 72)
    if payload.get("interpretacion"):
        print(f"  {payload['interpretacion']}")
        print("-" * 72)
    print(f"  {summary.get('titular', '')}")
    print()
    for line in _wrap(summary.get("explicacion_simple", "")):
        print(f"  {line}")
    print()
    print("  En palabras simples:")
    for line in _wrap(summary.get("explicacion_para_cualquiera", "")):
        print(f"    {line}")
    confidence = summary.get("confianza", {})
    if confidence:
        print(f"\n  Confianza: {confidence.get('nivel_texto', '?')} "
              f"({confidence.get('puntaje', 0):.0%})  ·  punto más débil: {confidence.get('punto_mas_debil', '-')}")
    factors = summary.get("factores", [])
    if factors:
        print("\n  Qué está pesando hoy:")
        for factor in factors[:5]:
            arrow = "↑" if factor.get("empuja") == "hacia arriba" else ("↓" if factor.get("empuja") else "·")
            print(f"    {arrow} {factor['texto']}")
    scenarios = payload.get("escenarios", {}).get("escenarios")
    if scenarios:
        print("\n  Escenarios simulados:")
        for key in ("pesimista", "base", "optimista"):
            case = scenarios.get(key, {})
            if case:
                print(f"    {key:11s} {case['rendimiento']:+.2%}  →  {case['precio']}")
    if not summary.get("hay_senal", False):
        print("\n  Por qué no hay señal:")
        for blocker in payload.get("senal", {}).get("bloqueos", [])[:4]:
            print(f"    · {blocker['motivo']}: {blocker['detalle']}")
    print("\n  Advertencia:", summary.get("advertencia", ""))
    print("=" * 72)
    print(f"  {payload.get('segundos', 0)}s · motor {ENGINE_NAME} {ENGINE_VERSION}")
    print()


def _wrap(text: str, width: int = 68) -> list[str]:
    import textwrap

    return textwrap.wrap(text, width=width) or [""]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="ritchie", description=f"{ENGINE_NAME} — {ENGINE_FULL_NAME}"
    )
    parser.add_argument("--version", action="version", version=f"{ENGINE_NAME} {ENGINE_VERSION}")
    sub = parser.add_subparsers(dest="comando", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--perfil", default="rapido", choices=("rapido", "completo", "exhaustivo"),
        help="Cuánto cómputo dedicar. El protocolo de validación es el mismo en los tres.",
    )
    common.add_argument(
        "--permitir-simulados", action="store_true",
        help="Permite caer en una serie simulada si no hay datos reales (solo para demostración).",
    )
    common.add_argument("--sin-cache", action="store_true", help="Ignora la caché de resultados.")
    common.add_argument(
        "--fuente",
        action="append",
        default=None,
        help="Fuente de datos a usar (se puede repetir para definir el orden). "
        "Por defecto: yahoo_finance, stooq, alpha_vantage, csv.",
    )
    common.add_argument("--json", action="store_true", help="Imprime la respuesta completa en JSON.")

    ask = sub.add_parser("preguntar", parents=[common], help="Pregunta en español.")
    ask.add_argument("pregunta", help="Por ejemplo: «¿probabilidad de que MARA suba 4% mañana?»")

    analyze = sub.add_parser("analizar", parents=[common], help="Análisis con parámetros explícitos.")
    analyze.add_argument("simbolo")
    analyze.add_argument("--horizonte", type=int, default=1)
    analyze.add_argument("--umbral", type=float, default=0.04)
    analyze.add_argument("--direccion", default="up", choices=("up", "down", "range"))
    analyze.add_argument("--modo", default="close", choices=("close", "touch"))

    serve_parser = sub.add_parser("servidor", parents=[common], help="Levanta la interfaz web.")
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument(
        "--puerto", type=int, default=8777,
        help="Puerto a usar. 0 = que el sistema elija uno libre (útil si el 8777 ya está ocupado).",
    )
    serve_parser.add_argument(
        "--sin-navegador", action="store_true",
        help="No abrir el navegador automáticamente al iniciar.",
    )

    demo_parser = sub.add_parser(
        "demo", help="Corrida de demostración con datos SIMULADOS y etiquetados como tales."
    )
    demo_parser.add_argument(
        "--tipo",
        default="patron",
        choices=("patron", "ruido", "realista"),
        help="patron: serie con una ventaja real incrustada (se espera que RITCHIE la encuentre). "
        "ruido: paseo aleatorio (se espera que diga que no hay señal). "
        "realista: serie con volatilidad agrupada, sin patrón obvio.",
    )

    args = parser.parse_args(argv)

    source_order = tuple(getattr(args, "fuente", None) or DEFAULT_SOURCE_ORDER)
    if not getattr(args, "fuente", None):
        # Si la persona no eligió fuentes a mano y hay memoria persistente
        # configurada (ver data/supabase_store.py), se prueba primero: es
        # gratis, no depende de la red y puede tener justo lo que se pidió.
        from .data import supabase_store

        if supabase_store.configured():
            source_order = ("supabase_store",) + source_order

    if args.comando == "servidor":
        from .server import serve

        serve(
            host=args.host,
            port=args.puerto,
            profile=args.perfil,
            allow_synthetic=args.permitir_simulados,
            source_order=source_order,
            open_browser=not args.sin_navegador,
        )
        return 0

    if args.comando == "demo":
        sources = {
            "patron": "synthetic_demo_pattern",
            "ruido": "synthetic_random_walk",
            "realista": "synthetic_test_fixture",
        }
        expectation = {
            "patron": "La serie tiene una ventaja real incrustada: RITCHIE debería encontrarla.",
            "ruido": "La serie es un paseo aleatorio: RITCHIE debería decir que no hay señal.",
            "realista": "Serie con volatilidad agrupada y sin patrón direccional obvio.",
        }
        engine = Ritchie(
            config=config_for_profile("rapido"),
            allow_synthetic=True,
            use_result_cache=False,
            source_order=(sources[args.tipo],),
        )
        print("Corrida de DEMOSTRACIÓN con datos simulados (no es un mercado real).")
        print(expectation[args.tipo])
        result = engine.ask(
            "¿Qué probabilidad hay de que DEMO suba 4% mañana?",
            progress=lambda stage, value: print(f"  [{value:5.0%}] {stage}", flush=True),
        )
        _print_answer(result.payload)
        return 0

    engine = Ritchie(
        config=config_for_profile(args.perfil),
        allow_synthetic=args.permitir_simulados,
        use_result_cache=not args.sin_cache,
        source_order=source_order,
    )
    progress = lambda stage, value: print(f"  [{value:5.0%}] {stage}", flush=True)  # noqa: E731

    if args.comando == "preguntar":
        result = engine.ask(args.pregunta, progress=progress)
    else:
        spec = TargetSpec(
            horizon=args.horizonte,
            threshold=args.umbral,
            direction=args.direccion,
            mode=args.modo,
        )
        result = engine.analyze(args.simbolo, spec, progress=progress)

    if not result.ok:
        print("\n" + (result.payload.get("mensaje") or "No se pudo responder."))
        for reason in result.payload.get("motivos", [])[:6]:
            print("  ·", reason)
        for note in result.payload.get("aclaraciones", []):
            print("  ·", note)
        return 1

    _print_answer(result.payload, full=args.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
