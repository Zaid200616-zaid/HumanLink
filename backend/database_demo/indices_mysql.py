#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Archivo académico: ÍNDICES MySQL.

Fuente de referencia: database/indexes_mysql.sql (definiciones en schema Prisma/migraciones)

HumanLink real: Prisma usa estos índices automáticamente en consultas
Este script: SHOW INDEX / information_schema.STATISTICS (solo lectura)
"""

from __future__ import annotations

from db_utils import ENCABEZADO_ACADEMICO, conectar, db_config, fetchall_dict, imprimir_filas, leer_texto


TABLAS_DEMO = (
    "Empleado",
    "CapacitacionEmpleado",
    "SolicitudPermiso",
    "Candidato",
    "CalculoLaboralInfo",
)


def _etiqueta_indice(non_unique, key_name: str) -> str:
    if key_name == "PRIMARY":
        return "PK (Primary Key)"
    if non_unique == 0 and key_name != "PRIMARY":
        return "UNIQUE"
    return "INDEX (secundario)"


def mostrar_indices(tabla: str) -> None:
    """
    SHOW INDEX FROM tabla — demuestra PK, FK implícitas, UNIQUE e índices secundarios.

    PK = Primary Key
    FK = Foreign Key (índice asociado a relación)
    UNIQUE = restricción de unicidad
    INDEX = índice secundario
    """
    # conectar() establece una sesión cliente-servidor con MySQL (handshake, autenticación,
    # selección de schema). No ejecuta DDL ni DML; solo habilita el canal para enviar
    # sentencias. La conexión debe cerrarse explícitamente para devolver el descriptor de red.
    conn = conectar()
    # try/finally asegura que conn.close() se invoque aunque execute() o fetchall_dict()
    # lancen excepción. Sin este patrón, conexiones huérfanas agotan max_connections del motor.
    try:
        # cursor() instancia un objeto cursor sobre conn: buffer de filas, contador de filas
        # afectadas y estado de la última sentencia. 'human' es el handle local del cursor;
        # cada execute() serializa la SQL y espera el result set del protocolo MySQL.
        human = conn.cursor()
        print(f"\nSHOW INDEX FROM `{tabla}`")
        # SHOW INDEX FROM `<tabla>` es una consulta de catálogo de solo lectura: interroga
        # metadatos del diccionario de datos (Key_name, Column_name, Non_unique, Seq_in_index,
        # Index_type, Cardinality, etc.) sin ALTER, CREATE ni DROP. No bloquea escrituras en la
        # tabla objetivo más allá de un acceso breve al information_schema interno del motor.
        human.execute(f"SHOW INDEX FROM `{tabla}`")
        rows = fetchall_dict(human)
        if not rows:
            print("  (sin índices o tabla inexistente)")
            return
        print(f"\nÍndices en {tabla} ({len(rows)} entradas):")
        for r in rows:
            tipo = _etiqueta_indice(r.get("Non_unique"), r.get("Key_name", ""))
            print(
                f"  {r.get('Key_name')} · col={r.get('Column_name')} · "
                f"seq={r.get('Seq_in_index')} · {tipo}"
            )
    finally:
        # close() termina la sesión (COM_QUIT), libera buffers del cursor asociado y cierra
        # el socket TCP. Idempotente en la práctica: invocarlo en finally evita fugas de recursos.
        conn.close()


def mostrar_estadisticas_schema() -> None:
    """Consulta information_schema.STATISTICS — vista global de índices en humanlink."""
    db = db_config()["database"]
    # Sentencia SELECT sobre information_schema.STATISTICS: vista del catálogo SQL estándar
    # que materializa metadatos de índices (una fila por columna indexada). El filtro
    # TABLE_SCHEMA = %s restringe al schema humanlink; ORDER BY facilita lectura agrupada.
    sql = """
        SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
          FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = %s
         ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    """
    # Misma apertura de sesión que en mostrar_indices: conexión dedicada por invocación,
    # sin pool persistente; credenciales y host provienen de db_config() vía conectar().
    conn = conectar()
    # try/finally: garantiza cierre determinista del socket aunque la consulta al catálogo falle
    # (timeout, permisos insuficientes sobre information_schema, schema inexistente, etc.).
    try:
        # cursor() sobre conn; el placeholder %s en la SQL se sustituye de forma parametrizada
        # por human.execute(sql, (db,)) para evitar concatenación directa del nombre de schema.
        human = conn.cursor()
        print(f"\ninformation_schema.STATISTICS — schema `{db}`")
        # information_schema.STATISTICS es una vista estándar del catálogo SQL: expone una fila
        # por cada columna participante en un índice (TABLE_NAME, INDEX_NAME, COLUMN_NAME,
        # NON_UNIQUE, SEQ_IN_INDEX, CARDINALITY, INDEX_TYPE). SELECT sobre ella es estrictamente
        # lectura; no crea, altera ni elimina índices. Equivalente conceptual a SHOW INDEX pero
        # filtrable por TABLE_SCHEMA y ordenable globalmente en todo el schema humanlink.
        human.execute(sql, (db,))
        rows = fetchall_dict(human)
        print(f"Total entradas: {len(rows)}")
        imprimir_filas(rows, limite=40)
    finally:
        # Liberación obligatoria de la conexión tras consumir el result set del catálogo.
        conn.close()


def menu() -> None:
    print(ENCABEZADO_ACADEMICO)
    while True:
        print("\n--- Índices MySQL ---")
        print("1. Empleado")
        print("2. CapacitacionEmpleado")
        print("3. SolicitudPermiso")
        print("4. Candidato")
        print("5. CalculoLaboralInfo")
        print("6. Otra tabla (nombre manual)")
        print("7. Estadísticas completas (information_schema)")
        print("0. Volver")
        op = input("\nOpción: ").strip()
        if op == "0":
            break
        elif op in {"1", "2", "3", "4", "5"}:
            mostrar_indices(TABLAS_DEMO[int(op) - 1])
        elif op == "6":
            mostrar_indices(leer_texto("Nombre de tabla: "))
        elif op == "7":
            mostrar_estadisticas_schema()
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    menu()
