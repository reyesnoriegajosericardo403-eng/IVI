#!/bin/bash
# Doble clic en este archivo para arrancar RITCHIE en macOS.
# Si macOS bloquea la primera vez ("no se puede verificar el desarrollador"):
# clic derecho sobre este archivo → Abrir → Abrir, una sola vez.
cd "$(dirname "$0")"
PYTHON="python3"
if ! command -v python3 >/dev/null 2>&1; then
  echo "No se encontró Python en esta Mac."
  echo "Instálalo desde https://www.python.org/downloads/ y vuelve a intentar."
  read -n 1 -s -r -p "Presiona cualquier tecla para cerrar..."
  exit 1
fi
"$PYTHON" iniciar.py "$@"
echo
read -n 1 -s -r -p "RITCHIE se detuvo. Presiona cualquier tecla para cerrar esta ventana..."
