#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Menú principal de evidencia académica Python + MySQL.

HumanLink real: Next.js -> Prisma -> MySQL
Estos scripts: Python -> SQL -> MySQL (solo evidencia en clase)
"""

from __future__ import annotations

import sys
from pathlib import Path

# Permite importar módulos del mismo directorio al ejecutar desde la raíz del repo.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from campos_calculados import menu as menu_calculated
from consultas_avanzadas import menu as menu_queries
from db_utils import ENCABEZADO_ACADEMICO
from indices_mysql import menu as menu_indexes
from informacion_bd import menu as menu_info
from procedimientos_mysql import menu as menu_procedures
from triggers_mysql import menu as menu_triggers
from vistas_mysql import menu as menu_views


def main() -> None:
    print("=" * 60)
    print("HumanLink — Bases de Datos Avanzadas")
    print("=" * 60)
    print(ENCABEZADO_ACADEMICO)

    while True:
        print("\nMenú principal")
        print("1. Triggers")
        print("2. Procedimientos almacenados")
        print("3. Vistas")
        print("4. Consultas avanzadas (Q1–Q12)")
        print("5. Índices")
        print("6. Campos calculados")
        print("7. Información general MySQL")
        print("0. Salir")

        op = input("\nOpción: ").strip()
        if op == "0":
            print("Fin de la demostración académica.")
            break
        elif op == "1":
            menu_triggers()
        elif op == "2":
            menu_procedures()
        elif op == "3":
            menu_views()
        elif op == "4":
            menu_queries()
        elif op == "5":
            menu_indexes()
        elif op == "6":
            menu_calculated()
        elif op == "7":
            menu_info()
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrumpido.")
    except RuntimeError as err:
        print(f"Error de configuración: {err}")
        sys.exit(1)
