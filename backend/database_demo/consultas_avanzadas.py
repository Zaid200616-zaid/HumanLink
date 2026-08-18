#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Archivo académico: CONSULTAS AVANZADAS Q1–Q12.

Fuente: database/advanced_queries.sql (se lee sin modificar).

HumanLink real: lógica equivalente en APIs Next.js / Prisma
Este script: ejecuta el SQL tal cual está en el archivo académico.
"""

from __future__ import annotations

from db_utils import ENCABEZADO_ACADEMICO, cargar_consultas_avanzadas, ejecutar_select

# Comentario pedagógico por consulta (técnica SQL — NO modifica el SQL de Q1–Q12).
Q_COMENTARIO = {
    "Q1": "Q1 — INNER JOIN: empleados activos por organización y departamento.",
    "Q2": "Q2 — LEFT JOIN / GROUP BY: vacantes abiertas con conteo de candidatos.",
    "Q3": "Q3 — RIGHT JOIN: turnos con o sin empleados asignados.",
    "Q4": "Q4 — GROUP BY / HAVING: departamentos con más de 2 empleados activos.",
    "Q5": "Q5 — CASE / SUM / COUNT: resumen mensual de asistencias por estado.",
    "Q6": "Q6 — AVG / MIN / MAX: estadísticas de evaluaciones de desempeño.",
    "Q7": "Q7 — Subconsulta: candidatos en vacantes con cupo agotado.",
    "Q8": "Q8 — CTE: solicitudes pendientes y saldo estimado de vacaciones.",
    "Q9": "Q9 — RANK() OVER: ranking de retardos por departamento.",
    "Q10": "Q10 — CTE / porcentajes / función de ventana: pipeline de contratación.",
    "Q11": "Q11 — DATEDIFF: documentos próximos a vencer.",
    "Q12": "Q12 — DATEDIFF / antigüedad: quejas abiertas antiguas.",
}

# Metadatos pedagógicos por consulta (técnica y RF).
META = {
    "Q1": {
        "objetivo": "Empleados activos por organización y departamento",
        "tablas": "Empleado, Departamento, Organizacion",
        "tecnica": "INNER JOIN",
        "rf": "RF-H02 / RF-H19",
    },
    "Q2": {
        "objetivo": "Vacantes abiertas con conteo de candidatos",
        "tablas": "Vacante, Departamento, Candidato",
        "tecnica": "INNER JOIN, LEFT JOIN, GROUP BY",
        "rf": "RF-H03 / RF-H04",
    },
    "Q3": {
        "objetivo": "Turnos con o sin empleados asignados",
        "tablas": "Empleado, Turno",
        "tecnica": "RIGHT JOIN",
        "rf": "RF-H20",
    },
    "Q4": {
        "objetivo": "Departamentos con más de 2 empleados activos",
        "tablas": "Departamento, Empleado",
        "tecnica": "GROUP BY, HAVING",
        "rf": "RF-H19",
    },
    "Q5": {
        "objetivo": "Resumen mensual de asistencias por estado",
        "tablas": "Asistencia",
        "tecnica": "CASE, SUM, COUNT, GROUP BY",
        "rf": "RF-H06",
    },
    "Q6": {
        "objetivo": "Estadísticas de evaluaciones de desempeño",
        "tablas": "EvaluacionDesempeno, Empleado",
        "tecnica": "AVG, MIN, MAX, GROUP BY, HAVING",
        "rf": "RF-H11",
    },
    "Q7": {
        "objetivo": "Candidatos en vacantes con cupo agotado",
        "tablas": "Candidato, Vacante",
        "tecnica": "Subconsulta",
        "rf": "RF-H04",
    },
    "Q8": {
        "objetivo": "Solicitudes pendientes y saldo estimado",
        "tablas": "Empleado, CalculoLaboralInfo, SolicitudPermiso",
        "tecnica": "CTE, LEFT JOIN, función fn_dias_vacaciones_lft",
        "rf": "RF-H13",
    },
    "Q9": {
        "objetivo": "Ranking de retardos por departamento",
        "tablas": "Asistencia, Empleado, Departamento",
        "tecnica": "Subconsulta, RANK() OVER",
        "rf": "RF-H06",
    },
    "Q10": {
        "objetivo": "Porcentaje del pipeline de contratación",
        "tablas": "Candidato",
        "tecnica": "CTE, porcentajes, funciones de ventana",
        "rf": "RF-H04",
    },
    "Q11": {
        "objetivo": "Documentos próximos a vencer",
        "tablas": "Documento, Empleado",
        "tecnica": "DATEDIFF, filtros de fecha",
        "rf": "RF-H18",
    },
    "Q12": {
        "objetivo": "Quejas antiguas abiertas",
        "tablas": "QuejaLaboral, Empleado",
        "tecnica": "DATEDIFF, filtros por estado",
        "rf": "RF-H16",
    },
}


def ejecutar_consulta(qid: str) -> None:
    # cargar_consultas_avanzadas() lee database/advanced_queries.sql, extrae los
    # bloques Q1–Q12 (título + SQL) mediante expresión regular y devuelve un dict
    # en memoria; el archivo SQL no se modifica en disco.
    queries = cargar_consultas_avanzadas()
    if qid not in queries:
        print(f"No se encontró {qid} en database/advanced_queries.sql")
        return
    meta = META.get(qid, {})
    comentario = Q_COMENTARIO.get(qid, "")
    block = queries[qid]
    print(f"\n{'='*60}")
    print(f"{qid} · {block['titulo']}")
    if comentario:
        print(comentario)
    print(f"Objetivo: {meta.get('objetivo', '—')}")
    print(f"Tablas: {meta.get('tablas', '—')}")
    print(f"Técnica SQL: {meta.get('tecnica', '—')}")
    print(f"RF: {meta.get('rf', '—')}")
    print(f"{'='*60}")

    # CONSULTA AVANZADA (identificador dinámico según qid: Q1–Q12).
    # Objetivo: ver meta['objetivo'] impreso arriba; describe el propósito de negocio.
    # Tablas involucradas: ver meta['tablas'].
    # Técnicas SQL: ver meta['tecnica'] y Q_COMENTARIO[qid] para el detalle técnico.
    #
    # La siguiente instrucción envía block["sql"] a MySQL mediante ejecutar_select().
    # Python no altera el texto SQL: proviene intacto de database/advanced_queries.sql.
    #
    # Flujo:
    #   Python -> ejecutar_select(block["sql"])
    #         -> conexión MySQL -> human.execute(SELECT ...)
    #         -> MySQL ejecuta la consulta
    #         -> Python recupera filas con fetchall_dict() e imprime resultado
    ejecutar_select(block["sql"])


def menu() -> None:
    print(ENCABEZADO_ACADEMICO)
    # Carga inicial del catálogo Q1–Q12 desde advanced_queries.sql; el dict
    # queries alimenta el listado del menú y la resolución de SQL en ejecutar_consulta.
    queries = cargar_consultas_avanzadas()
    if not queries:
        print("Advertencia: no se cargaron consultas. Verifique advanced_queries.sql")
    while True:
        print("\n--- Consultas avanzadas (Q1–Q12) ---")
        # Iteración ordenada por número de consulta para mostrar opciones 1–12.
        for qid in sorted(queries.keys(), key=lambda x: int(x[1:])):
            print(f"  {qid[1:]}. {qid} — {queries[qid]['titulo'][:50]}")
        print("  0. Volver")
        op = input("\nOpción: ").strip()
        # Rama salida: regresa al menú principal del script que invocó este módulo.
        if op == "0":
            break
        # Rama ejecución: convierte la opción numérica en identificador "Q{n}".
        if op.isdigit() and 1 <= int(op) <= 12:
            ejecutar_consulta(f"Q{op}")
        # Rama inválida: entrada fuera del rango 0–12 o no numérica.
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    menu()
