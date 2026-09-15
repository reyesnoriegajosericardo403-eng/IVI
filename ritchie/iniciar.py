#!/usr/bin/env python3
"""Arranca RITCHIE con un solo comando: `python3 iniciar.py`.

Pensado para alguien sin experiencia técnica: revisa que las librerías estén
instaladas (y las instala solo si hacen falta), levanta el servidor y abre el
navegador por su cuenta. Si algo falla, lo explica en español y sin jerga.

Uso:
    python3 iniciar.py                 # datos reales (Yahoo Finance, etc.)
    python3 iniciar.py --demo          # demostración sin internet, con datos
                                        # simulados y anunciados como tales
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
MINIMO_PYTHON = (3, 10)


def _linea(caracter: str = "─", ancho: int = 60) -> None:
    print(caracter * ancho)


def verificar_version_python() -> None:
    if sys.version_info < MINIMO_PYTHON:
        actual = ".".join(map(str, sys.version_info[:3]))
        minimo = ".".join(map(str, MINIMO_PYTHON))
        print(f"❌ Se necesita Python {minimo} o más nuevo. Tienes {actual}.")
        print("   Descarga la versión más reciente en https://www.python.org/downloads/")
        sys.exit(1)


def dependencias_instaladas() -> bool:
    try:
        import numpy  # noqa: F401
        import pandas  # noqa: F401
        import scipy  # noqa: F401
        import sklearn  # noqa: F401
    except ImportError:
        return False
    return True


def instalar_dependencias() -> None:
    print("Primera vez que se ejecuta: instalando lo que hace falta (numpy, pandas, scipy,")
    print("scikit-learn). Esto solo pasa una vez y toma uno o dos minutos...")
    _linea()
    requisitos = RAIZ / "requirements.txt"
    resultado = subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "-r", str(requisitos)]
    )
    _linea()
    if resultado.returncode != 0:
        print("❌ No se pudieron instalar las librerías necesarias.")
        print("   Intenta ejecutar esto a mano en una terminal y revisa el mensaje de error:")
        print(f"   {sys.executable} -m pip install -r {requisitos}")
        sys.exit(1)
    print("✅ Listo. Instalado correctamente.\n")


def main() -> None:
    verificar_version_python()

    print()
    _linea("═")
    print("  RITCHIE — arrancando…")
    _linea("═")
    print()

    if not dependencias_instaladas():
        instalar_dependencias()

    sys.path.insert(0, str(RAIZ))
    from ritchie.__main__ import main as ritchie_main  # noqa: E402

    argumentos = ["servidor"]
    if "--demo" in sys.argv:
        argumentos += ["--permitir-simulados", "--fuente", "synthetic_demo_pattern"]
        print("Modo demostración: se usará una serie SIMULADA, no un mercado real.\n")

    print("Se abrirá tu navegador en un momento. Si no pasa, entra tú mismo a la")
    print("dirección que aparezca abajo (algo como http://127.0.0.1:8777).")
    print("Para detener RITCHIE, vuelve a esta ventana y presiona Ctrl+C.\n")

    sys.exit(ritchie_main(argumentos) or 0)


if __name__ == "__main__":
    main()
