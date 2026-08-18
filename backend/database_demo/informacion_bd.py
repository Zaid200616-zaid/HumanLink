#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Información general del servidor y objetos MySQL (solo lectura).
"""

from __future__ import annotations

from db_utils import ENCABEZADO_ACADEMICO, conectar, db_config, fetchall_dict, imprimir_filas


def version_mysql() -> None:
    """SELECT VERSION() — versión del motor MySQL/MariaDB."""
    # conectar() abre sesión con el servidor; operación de infraestructura, sin efecto sobre datos.
    conn = conectar()
    # try/finally: close() se ejecuta siempre, incluso si VERSION() o fetchall_dict() fallan.
    try:
        # human: cursor por defecto (tuplas); canal para enviar SELECT y recibir una fila escalar.
        human = conn.cursor()
        print("\n--- Versión del servidor ---")
        # SELECT VERSION() consulta función built-in del motor; devuelve cadena de versión
        # (p. ej. 8.0.x). Solo lectura, sin bloqueos de tabla ni modificación de estado persistente.
        human.execute("SELECT VERSION() AS version")
        print(fetchall_dict(human))
    finally:
        # Cierra socket y libera recursos de sesión tras leer la versión del servidor.
        conn.close()


def listar_tablas() -> None:
    """SHOW TABLES — tablas base del schema humanlink."""
    # Sesión MySQL independiente para esta operación de introspección del catálogo.
    conn = conectar()
    # Protege el cierre de conexión ante errores de red o permisos durante SHOW TABLES.
    try:
        # Cursor de lectura; db_config()["database"] identifica el schema objetivo del catálogo.
        human = conn.cursor()
        db = db_config()["database"]
        print(f"\n--- Tablas en `{db}` ---")
        # SHOW TABLES FROM `<schema>` lista nombres de tablas base del schema indicado.
        # Comando de metadatos: no INSERT/UPDATE/DELETE; equivalente a TABLE_TYPE='BASE TABLE'
        # en information_schema.TABLES. No crea ni elimina objetos.
        human.execute(f"SHOW TABLES FROM `{db}`")
        rows = fetchall_dict(human)
        for i, r in enumerate(rows, 1):
            print(f"  {i}. {list(r.values())[0]}")
        print(f"Total: {len(rows)}")
    finally:
        # Devuelve el descriptor de conexión al pool del SO; imprescindible tras listar catálogo.
        conn.close()


def listar_triggers() -> None:
    """SHOW TRIGGERS — triggers instalados (evidencia de scripts académicos)."""
    # Apertura de conexión exclusiva para consultar el registro de triggers del schema.
    conn = conectar()
    # finally garantiza close() si SHOW TRIGGERS agota memoria del buffer o pierde conexión.
    try:
        # Handle del cursor; SHOW TRIGGERS puede devolver muchas filas (Trigger, Event, etc.).
        human = conn.cursor()
        db = db_config()["database"]
        print(f"\n--- Triggers en `{db}` ---")
        # SHOW TRIGGERS FROM `<schema>` expone metadatos de triggers existentes: Trigger,
        # Event, Table, Statement, Timing, Created, sql_mode, Definer, character_set_client,
        # collation_connection, Database Collation. Solo lectura del catálogo; no dispara ni
        # compila triggers, no ejecuta CREATE TRIGGER ni DROP TRIGGER.
        human.execute(f"SHOW TRIGGERS FROM `{db}`")
        rows = fetchall_dict(human)
        imprimir_filas(rows, 30)
    finally:
        # Cierre explícito tras consumir el inventario de triggers del schema humanlink.
        conn.close()


def listar_procedimientos() -> None:
    """SHOW PROCEDURE STATUS — procedimientos almacenados del schema."""
    # Nueva sesión TCP/autenticada hacia el servidor MySQL para introspección de rutinas.
    conn = conectar()
    # try/finally: asegura liberación de recursos si el filtro WHERE Db falla o no hay permisos.
    try:
        # Cursor parametrizado: el nombre de schema se pasa como tupla (db,) al execute().
        human = conn.cursor()
        db = db_config()["database"]
        print(f"\n--- Procedimientos en `{db}` ---")
        # SHOW PROCEDURE STATUS WHERE Db = %s lista rutinas almacenadas del schema: Db, Name,
        # Type, Definer, Modified, Created, Security_type, Comment, character_set_client,
        # collation_connection, Database Collation. Metadatos únicamente; no invoca CALL ni
        # altera el cuerpo de procedimientos. Filtrado seguro vía placeholder %s.
        human.execute("SHOW PROCEDURE STATUS WHERE Db = %s", (db,))
        rows = fetchall_dict(human)
        for r in rows:
            print(f"  - {r.get('Name')}")
        print(f"Total: {len(rows)}")
    finally:
        # Termina la sesión tras enumerar procedimientos almacenados del catálogo mysql.proc.
        conn.close()


def listar_vistas() -> None:
    """SHOW FULL TABLES WHERE Table_type='VIEW' — vistas administrativas."""
    # Conexión dedicada para consultar objetos tipo VIEW en el schema configurado.
    conn = conectar()
    # Bloque de protección: close() en finally aunque la cláusula WHERE no devuelva filas.
    try:
        # Cursor sobre conn; SHOW FULL TABLES devuelve columnas Tables_in_<db> y Table_type.
        human = conn.cursor()
        db = db_config()["database"]
        print(f"\n--- Vistas en `{db}` ---")
        # SHOW FULL TABLES IN `<schema>` WHERE Table_type = 'VIEW' filtra vistas del catálogo.
        # A diferencia de SHOW TABLES (solo tablas base), incluye la columna Table_type
        # ('VIEW' vs 'BASE TABLE'). Operación de solo lectura sobre information_schema;
        # no crea vistas ni materializa datos.
        human.execute(f"SHOW FULL TABLES IN `{db}` WHERE Table_type = 'VIEW'")
        rows = fetchall_dict(human)
        for r in rows:
            print(f"  - {list(r.values())[0]}")
        print(f"Total: {len(rows)}")
    finally:
        # Libera la conexión tras listar vistas administrativas del schema humanlink.
        conn.close()


def menu() -> None:
    print(ENCABEZADO_ACADEMICO)
    while True:
        print("\n--- Información general MySQL ---")
        print("1. SELECT VERSION()")
        print("2. SHOW TABLES")
        print("3. SHOW TRIGGERS")
        print("4. SHOW PROCEDURE STATUS")
        print("5. SHOW FULL TABLES (vistas)")
        print("0. Volver")
        op = input("\nOpción: ").strip()
        if op == "0":
            break
        elif op == "1":
            version_mysql()
        elif op == "2":
            listar_tablas()
        elif op == "3":
            listar_triggers()
        elif op == "4":
            listar_procedimientos()
        elif op == "5":
            listar_vistas()
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    menu()
