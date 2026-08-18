"""
HumanLink — Bases de Datos Avanzadas

Utilidades compartidas para scripts de demostración académica.

HumanLink real:
    Next.js -> Prisma -> MySQL

Estos scripts Python existen únicamente para mostrar de forma directa:
    Python -> SQL -> MySQL -> Resultado

No sustituyen la lógica del sistema principal.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    from mysql.connector.connection import MySQLConnection
except ImportError as exc:
    raise ImportError(
        "Instale: pip install mysql-connector-python python-dotenv"
    ) from exc

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore

ROOT_DIR = Path(__file__).resolve().parents[2]
if load_dotenv:
    load_dotenv(ROOT_DIR / ".env")
    load_dotenv(ROOT_DIR / "backend" / ".env")

ENCABEZADO_ACADEMICO = """
# ============================================================
# INTEGRACIÓN PYTHON + MYSQL — HUMANLINK
#
# Este archivo permite observar desde código Python las
# operaciones utilizadas para interactuar con los elementos
# avanzados de la base de datos HumanLink.
#
# TRIGGERS:
# No se llaman directamente desde Python.
# Python ejecuta INSERT o UPDATE y MySQL dispara el trigger
# automáticamente según el evento configurado.
#
# PROCEDIMIENTOS ALMACENADOS:
# Se invocan explícitamente desde Python mediante CALL.
#
# VISTAS:
# Se consultan mediante SELECT FROM NombreVista.
#
# CONSULTAS AVANZADAS:
# Python envía el SELECT correspondiente a MySQL y muestra
# los resultados obtenidos.
# ============================================================

HumanLink — Evidencia académica (NO es el flujo Next.js/Prisma)
Sistema real: Next.js -> Prisma -> MySQL
Este script: Python -> SQL -> MySQL -> Resultado
""".strip()


def db_config() -> dict[str, Any]:
    """Lee credenciales desde variables de entorno (sin contraseñas hardcodeadas)."""
    url = os.environ.get("DATABASE_URL", "")
    cfg = {
        "host": os.environ.get("DB_HOST") or os.environ.get("MYSQL_HOST") or "localhost",
        "port": int(os.environ.get("DB_PORT") or os.environ.get("MYSQL_PORT") or "3306"),
        "database": os.environ.get("DB_NAME") or os.environ.get("MYSQL_DATABASE") or "humanlink",
        "user": os.environ.get("DB_USER") or os.environ.get("MYSQL_USER") or "",
        "password": os.environ.get("DB_PASSWORD") or os.environ.get("MYSQL_PASSWORD") or "",
    }
    if url.startswith("mysql://"):
        parsed = urlparse(url)
        cfg["user"] = parsed.username or cfg["user"]
        cfg["password"] = parsed.password or cfg["password"]
        cfg["host"] = parsed.hostname or cfg["host"]
        cfg["port"] = parsed.port or cfg["port"]
        db_name = (parsed.path or "/humanlink").lstrip("/")
        cfg["database"] = db_name or cfg["database"]
    if not cfg["user"]:
        raise RuntimeError("Configure DB_USER/DB_PASSWORD o DATABASE_URL en .env")
    return cfg


def conectar() -> MySQLConnection:
    # db_config() resuelve host, puerto, base, usuario y contraseña desde .env
    # (DATABASE_URL o variables DB_* / MYSQL_* individuales).
    cfg = db_config()
    # mysql.connector.connect abre una sesión TCP con el servidor MySQL.
    # autocommit=False: cada sentencia queda dentro de una transacción explícita
    # hasta commit() o rollback(); necesario para CALL con mutaciones reversibles.
    # charset/collation utf8mb4: soporte completo de caracteres Unicode en resultados.
    return mysql.connector.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        autocommit=False,
    )


def mensaje_mysql(err: MySQLError) -> str:
    """Texto del error MySQL (incluye SIGNAL SQLSTATE 45000)."""
    if getattr(err, "msg", None):
        return str(err.msg)
    if len(err.args) >= 2 and err.args[1]:
        return str(err.args[1])
    return str(err)


def confirmar_mutacion() -> bool:
    print("\nEsta operación modificará datos de demostración.")
    return input("¿Deseas continuar? (S/N): ").strip().upper() == "S"


def elegir_commit_o_rollback(conn: MySQLConnection, nota: str = "") -> None:
    if nota:
        print(nota)
    while True:
        op = input("¿Confirmar cambios? COMMIT / ROLLBACK: ").strip().upper()
        # COMMIT confirma en MySQL todas las sentencias DML ejecutadas desde
        # start_transaction(); los cambios pasan a ser permanentes en disco.
        if op == "COMMIT":
            conn.commit()
            print("COMMIT realizado.")
            return
        # ROLLBACK descarta la transacción abierta y restaura el estado previo
        # a start_transaction() para las tablas afectadas por el CALL.
        if op == "ROLLBACK":
            conn.rollback()
            print("ROLLBACK realizado.")
            return
        print("Escriba COMMIT o ROLLBACK.")


def fetchone_dict(human) -> dict[str, Any] | None:
    # human: cursor de mysql.connector; mantiene el puntero sobre el result set
    # activo devuelto por la última execute() (SELECT o primer juego de CALL).
    row = human.fetchone()
    if row is None:
        return None
    # human.description expone metadatos de columnas (nombre, tipo); se usa para
    # mapear cada tupla de fetchone/fetchall a dict legible por clave de columna.
    cols = [d[0] for d in human.description]
    return dict(zip(cols, row))


def fetchall_dict(human) -> list[dict[str, Any]]:
    # Recupera todas las filas restantes del result set actual del cursor human.
    cols = [d[0] for d in human.description]
    return [dict(zip(cols, row)) for row in human.fetchall()]


def imprimir_filas(rows: list[dict[str, Any]], limite: int = 25) -> None:
    if not rows:
        print("  (sin filas)")
        return
    for i, row in enumerate(rows[:limite], 1):
        print(f"  [{i}] {row}")
    if len(rows) > limite:
        print(f"  ... {len(rows) - limite} filas más")


def ejecutar_select(sql: str, params: tuple | list | None = None, limite: int = 25) -> None:
    """Ejecuta SELECT de solo lectura y muestra resultados."""
    # Flujo SELECT (solo lectura):
    #   1. conectar() abre sesión MySQL con autocommit=False (sin transacción DML).
    #   2. cursor() crea human, objeto que envía SQL y recibe filas del servidor.
    #   3. execute() transmite el SELECT (o SELECT sobre vista) al optimizador MySQL.
    #   4. fetchall_dict(human) materializa el result set en lista de dicts.
    #   5. finally cierra la conexión; un SELECT no requiere commit explícito.
    conn = conectar()
    try:
        human = conn.cursor()
        print("\nSQL enviado a MySQL:")
        print(sql.strip())
        if params:
            print(f"Parámetros: {params}")
        # human.execute delega al conector la serialización de parámetros (%s)
        # y espera la respuesta del motor; para SELECT no hay cambios pendientes en txn.
        human.execute(sql, params or ())
        rows = fetchall_dict(human)
        print(f"\nResultado ({len(rows)} filas):")
        imprimir_filas(rows, limite)
    except MySQLError as err:
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        conn.close()


def ejecutar_call(
    sql_call: str,
    params: tuple | list,
    *,
    muta_datos: bool,
    descripcion: str = "",
) -> None:
    """Ejecuta CALL ... con transacción opcional COMMIT/ROLLBACK."""
    if muta_datos and not confirmar_mutacion():
        print("Operación cancelada.")
        return

    # Flujo CALL (procedimiento almacenado):
    #   1. conectar() + cursor human para canal bidireccional con MySQL.
    #   2. start_transaction() delimita un bloque atómico antes del CALL.
    #   3. execute(CALL ...) invoca el SP; MySQL puede devolver uno o más result sets.
    #   4. Recuperación de resultados: primer juego vía description + fetchall_dict;
    #      juegos adicionales con nextset() hasta agotar respuestas del SP.
    #   5. Si muta_datos: el operador elige COMMIT (persistir) o ROLLBACK (deshacer).
    #      Si no muta: commit automático para cerrar la transacción de lectura.
    #   6. Ante MySQLError: rollback inmediato; finally libera cursor y conexión.
    conn = conectar()
    human = conn.cursor()
    try:
        conn.start_transaction()
        if descripcion:
            print(f"\n{descripcion}")
        print("\nSQL enviado a MySQL:")
        print(sql_call.strip())
        print(f"Parámetros: {params}")
        # CALL es la única forma desde Python de ejecutar un procedimiento almacenado;
        # el SP corre en el servidor y puede emitir SELECT internos como result sets.
        human.execute(sql_call, params)
        rows: list[dict[str, Any]] = []
        # Primer result set: presente cuando el SP termina con SELECT o devuelve filas.
        if human.description:
            rows.extend(fetchall_dict(human))
        # nextset() avanza al siguiente juego de resultados del mismo CALL
        # (procedimientos con múltiples SELECT o cursores de salida).
        while human.nextset():
            if human.description:
                rows.extend(fetchall_dict(human))
        print(f"\nResultado del procedimiento ({len(rows)} filas):")
        imprimir_filas(rows)
        if muta_datos:
            # Transacción aún abierta: INSERT/UPDATE/DELETE del SP no son visibles
            # fuera de la sesión hasta que el operador confirme COMMIT.
            elegir_commit_o_rollback(conn, "Los cambios están en la transacción abierta.")
        else:
            conn.commit()
    except MySQLError as err:
        conn.rollback()
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        human.close()
        conn.close()


def leer_entero(mensaje: str) -> int:
    while True:
        raw = input(mensaje).strip()
        try:
            return int(raw)
        except ValueError:
            print("Ingrese un número entero válido.")


def leer_texto(mensaje: str, default: str = "") -> str:
    raw = input(mensaje).strip()
    return raw or default


def cargar_consultas_avanzadas() -> dict[str, dict[str, str]]:
    """
    Lee database/advanced_queries.sql sin modificarlo.
    Extrae Q1..Q12 tal como están definidas en el archivo académico.
    """
    # ROOT_DIR apunta a la raíz del proyecto; el SQL vive en database/.
    # El patrón regex localiza cada bloque delimitado por encabezados -- Q{n} · ...
    # y devuelve {"Q1": {"titulo", "sql"}, ...} para uso en consultas_avanzadas.py.
    path = ROOT_DIR / "database" / "advanced_queries.sql"
    text = path.read_text(encoding="utf-8")
    queries: dict[str, dict[str, str]] = {}
    pattern = re.compile(
        r"-- Q(\d+) · ([^\n]+)\n(?:--[^\n]*\n)*-- =+\n(.*?)(?=\n-- =+\n-- Q|\n-- =+\n-- FIN)",
        re.DOTALL,
    )
    for match in pattern.finditer(text):
        qid = f"Q{match.group(1)}"
        queries[qid] = {
            "titulo": match.group(2).strip(),
            "sql": match.group(3).strip(),
        }
    return queries
