"""Ejecución de SQL crudo contra MySQL para la demostración académica."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from django.conf import settings
from django.db import connection


@dataclass
class SqlResultSet:
    columns: list[str] = field(default_factory=list)
    rows: list[tuple[Any, ...]] = field(default_factory=list)


@dataclass
class SqlRunResult:
    ok: bool
    result_sets: list[SqlResultSet] = field(default_factory=list)
    error: str | None = None
    sql_executed: str | None = None


def _serialize_cell(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat(sep=" ", timespec="seconds")
    return value


def _rows_from_cursor(human) -> SqlResultSet:
    if not human.description:
        return SqlResultSet()
    columns = [col[0] for col in human.description]
    rows = [
        tuple(_serialize_cell(cell) for cell in row)
        for row in human.fetchall()
    ]
    return SqlResultSet(columns=columns, rows=rows)


def _collect_result_sets(human) -> list[SqlResultSet]:
    result_sets: list[SqlResultSet] = []
    while True:
        if human.description:
            result_sets.append(_rows_from_cursor(human))
        if not human.nextset():
            break
    return result_sets


def run_select(sql: str, params: tuple | list | None = None) -> SqlRunResult:
    sql = sql.strip().rstrip(";")
    try:
        with connection.cursor() as human:
            human.execute(sql, params or ())
            return SqlRunResult(
                ok=True,
                result_sets=[_rows_from_cursor(human)],
                sql_executed=sql,
            )
    except Exception as exc:  # noqa: BLE001 — captura errores MySQL para demo
        return SqlRunResult(ok=False, error=str(exc), sql_executed=sql)


def run_statement(sql: str, params: tuple | list | None = None) -> SqlRunResult:
    """INSERT/UPDATE/DELETE sin resultado tabular."""
    sql = sql.strip().rstrip(";")
    try:
        with connection.cursor() as human:
            human.execute(sql, params or ())
            return SqlRunResult(ok=True, sql_executed=sql)
    except Exception as exc:  # noqa: BLE001
        return SqlRunResult(ok=False, error=str(exc), sql_executed=sql)


def run_call(procedure: str, params: tuple | list | None = None) -> SqlRunResult:
    params = list(params or [])
    placeholders = ", ".join(["%s"] * len(params))
    sql = f"CALL {procedure}({placeholders})"
    try:
        with connection.cursor() as human:
            human.execute(sql, params)
            result_sets = _collect_result_sets(human)
            return SqlRunResult(ok=True, result_sets=result_sets, sql_executed=sql)
    except Exception as exc:  # noqa: BLE001
        return SqlRunResult(ok=False, error=str(exc), sql_executed=sql)


def parse_advanced_queries() -> dict[str, dict[str, str]]:
    """Lee Q1–Q12 desde database/advanced_queries.sql."""
    sql_path = Path(settings.BASE_DIR).parent / "database" / "advanced_queries.sql"
    if not sql_path.is_file():
        return {}

    content = sql_path.read_text(encoding="utf-8")
    queries: dict[str, dict[str, str]] = {}
    pattern = re.compile(
        r"-- =+\s*\n"
        r"--\s*(Q\d+)\s*·\s*([^\n]+)\n"
        r".*?"
        r"-- =+\s*\n"
        r"(.*?)"
        r"(?=\n-- =+\s*\n--\s*Q\d+|\n-- =+\s*\n--\s*FIN|\Z)",
        re.DOTALL,
    )
    for match in pattern.finditer(content):
        qid = match.group(1)
        title = match.group(2).strip()
        body = match.group(3)
        sql_lines = [
            line
            for line in body.splitlines()
            if line.strip() and not line.strip().startswith("--")
        ]
        sql = "\n".join(sql_lines).strip().rstrip(";")
        if sql:
            queries[qid] = {"title": title, "sql": sql}
    return queries


VISTA_NAMES = [
    "VistaEmpleados",
    "VistaVacantesAbiertas",
    "VistaCapacitaciones",
    "VistaReportes",
    "VistaEventos",
    "VistaDepartamentos",
    "VistaAsistencias",
    "VistaQuejas",
    "VistaCandidatosPipeline",
]

INDEX_TABLES = [
    "Empleado",
    "Vacante",
    "Candidato",
    "Capacitacion",
    "CapacitacionEmpleado",
    "SolicitudPermiso",
    "Asistencia",
    "Documento",
    "CalculoLaboralInfo",
    "AuditoriaLog",
    "Notificacion",
]

STORED_PROCEDURES: dict[str, dict[str, Any]] = {
    "sp_registrar_empleado": {
        "label": "Registrar empleado (RF-H02)",
        "params": [
            {"name": "p_numeroEmpleado", "label": "Número empleado", "type": "text"},
            {"name": "p_nombre", "label": "Nombre", "type": "text"},
            {"name": "p_apellidoPaterno", "label": "Apellido paterno", "type": "text"},
            {"name": "p_email", "label": "Email", "type": "email"},
            {"name": "p_fechaIngreso", "label": "Fecha ingreso", "type": "datetime-local"},
            {"name": "p_puesto", "label": "Puesto", "type": "text"},
            {"name": "p_departamentoId", "label": "Departamento ID", "type": "number"},
            {"name": "p_turnoId", "label": "Turno ID", "type": "number"},
        ],
    },
    "sp_crear_vacante": {
        "label": "Crear vacante (RF-H03)",
        "params": [
            {"name": "p_titulo", "label": "Título", "type": "text"},
            {"name": "p_descripcion", "label": "Descripción", "type": "textarea"},
            {"name": "p_departamentoId", "label": "Departamento ID", "type": "number"},
            {"name": "p_cupoTotal", "label": "Cupo total", "type": "number"},
        ],
    },
    "sp_aprobar_vacaciones": {
        "label": "Aprobar vacaciones (RF-H13)",
        "params": [
            {"name": "p_solicitudId", "label": "Solicitud ID", "type": "number"},
            {"name": "p_aprobadoPorId", "label": "Aprobado por (usuario ID)", "type": "number"},
            {"name": "p_respuesta", "label": "Respuesta", "type": "textarea"},
        ],
    },
    "sp_registrar_asistencia": {
        "label": "Registrar asistencia (RF-H06)",
        "params": [
            {"name": "p_empleadoId", "label": "Empleado ID", "type": "number"},
            {"name": "p_fecha", "label": "Fecha", "type": "datetime-local"},
            {"name": "p_horaEntrada", "label": "Hora entrada", "type": "text"},
            {"name": "p_horaSalida", "label": "Hora salida", "type": "text"},
            {
                "name": "p_estado",
                "label": "Estado",
                "type": "select",
                "choices": ["PUNTUAL", "RETARDO", "FALTA", "PERMISO", "VACACION"],
            },
        ],
    },
    "sp_contratar_candidato": {
        "label": "Contratar candidato (RF-H04)",
        "params": [{"name": "p_candidatoId", "label": "Candidato ID", "type": "number"}],
    },
    "sp_registrar_documento": {
        "label": "Registrar documento (RF-H18)",
        "params": [
            {"name": "p_empleadoId", "label": "Empleado ID", "type": "number"},
            {"name": "p_tipo", "label": "Tipo", "type": "text"},
            {"name": "p_nombre", "label": "Nombre", "type": "text"},
            {"name": "p_rutaArchivo", "label": "Ruta archivo", "type": "text"},
            {"name": "p_vencimiento", "label": "Vencimiento", "type": "datetime-local"},
        ],
    },
    "sp_generar_reporte_empleados_depto": {
        "label": "Reporte empleados por depto (RF-H08)",
        "params": [
            {"name": "p_usuarioId", "label": "Usuario ID", "type": "number"},
            {"name": "p_mes", "label": "Mes (YYYY-MM)", "type": "text"},
        ],
    },
    "sp_registrar_capacitacion": {
        "label": "Registrar capacitación (RF-H05)",
        "params": [
            {"name": "p_nombre", "label": "Nombre", "type": "text"},
            {"name": "p_descripcion", "label": "Descripción", "type": "textarea"},
            {"name": "p_fechaInicio", "label": "Fecha inicio", "type": "datetime-local"},
            {"name": "p_cupoMaximo", "label": "Cupo máximo", "type": "number"},
        ],
    },
    "sp_actualizar_departamento": {
        "label": "Actualizar departamento (RF-H19)",
        "params": [
            {"name": "p_departamentoId", "label": "Departamento ID", "type": "number"},
            {"name": "p_nombre", "label": "Nombre", "type": "text"},
            {"name": "p_descripcion", "label": "Descripción", "type": "textarea"},
            {"name": "p_supervisorId", "label": "Supervisor ID", "type": "number"},
            {"name": "p_activo", "label": "Activo (1/0)", "type": "number"},
        ],
    },
    "sp_registrar_evento": {
        "label": "Registrar evento (RF-H17)",
        "params": [
            {"name": "p_titulo", "label": "Título", "type": "text"},
            {"name": "p_descripcion", "label": "Descripción", "type": "textarea"},
            {"name": "p_fecha", "label": "Fecha", "type": "datetime-local"},
            {"name": "p_ubicacion", "label": "Ubicación", "type": "text"},
        ],
    },
    "sp_inscribir_capacitacion": {
        "label": "Inscribir capacitación (RF-H05)",
        "params": [
            {"name": "p_capacitacionId", "label": "Capacitación ID", "type": "number"},
            {"name": "p_empleadoId", "label": "Empleado ID", "type": "number"},
        ],
    },
    "sp_consultar_saldo_vacaciones": {
        "label": "Consultar saldo vacaciones (RF-H13)",
        "params": [{"name": "p_empleadoId", "label": "Empleado ID", "type": "number"}],
    },
}
