from django.contrib import messages
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from core.auth_utils import role_required
from database_demo.services.sql_runner import (
    INDEX_TABLES,
    STORED_PROCEDURES,
    VISTA_NAMES,
    parse_advanced_queries,
    run_call,
    run_select,
    run_statement,
)

DEMO_ROLES = ("Administrador", "Recursos Humanos")


def _demo_context(active: str, **extra):
    return {"demo_active": active, **extra}


def _coerce_param(raw: str, field_type: str):
    if raw is None or raw == "":
        return None
    if field_type == "number":
        return int(raw)
    if field_type in ("datetime-local", "datetime"):
        return raw.replace("T", " ") + (":00" if len(raw) == 16 else "")
    return raw


@role_required(*DEMO_ROLES)
def index(request):
    return render(
        request,
        "database_demo/index.html",
        _demo_context(
            "index",
            query_count=len(parse_advanced_queries()),
            sp_count=len(STORED_PROCEDURES),
            vista_count=len(VISTA_NAMES),
        ),
    )


@role_required(*DEMO_ROLES)
def info(request):
    sections = [
        ("Versión MySQL", "SELECT VERSION() AS version_mysql"),
        ("Tablas", "SHOW TABLES"),
        ("Triggers", "SHOW TRIGGERS"),
        (
            "Procedimientos almacenados",
            "SHOW PROCEDURE STATUS WHERE Db = DATABASE()",
        ),
        ("Vistas", "SHOW FULL TABLES WHERE Table_type = 'VIEW'"),
    ]
    results = []
    for label, sql in sections:
        outcome = run_select(sql)
        results.append({"label": label, "sql": sql, "outcome": outcome})
    return render(
        request,
        "database_demo/info.html",
        _demo_context("info", sections=results),
    )


@role_required(*DEMO_ROLES)
@require_http_methods(["GET", "POST"])
def indexes(request):
    table = request.GET.get("table") or request.POST.get("table") or "Empleado"
    if table not in INDEX_TABLES:
        table = "Empleado"

    outcome = None
    if request.method == "POST" and request.POST.get("action") == "show_index":
        sql = f"SHOW INDEX FROM `{table}`"
        outcome = run_select(sql)

    return render(
        request,
        "database_demo/indexes.html",
        _demo_context(
            "indexes",
            tables=INDEX_TABLES,
            selected_table=table,
            outcome=outcome,
        ),
    )


@role_required(*DEMO_ROLES)
@require_http_methods(["GET", "POST"])
def triggers(request):
    ctx = _demo_context("triggers")
    ctx["capacitaciones"] = run_select(
        "SELECT id, nombre, cupoMaximo FROM Capacitacion ORDER BY id LIMIT 20"
    )
    ctx["vacantes"] = run_select(
        "SELECT id, titulo FROM Vacante WHERE estado = 'ABIERTA' ORDER BY id LIMIT 20"
    )
    ctx["solicitudes_pendientes"] = run_select(
        """
        SELECT sp.id, sp.empleadoId, sp.diasSolicitados,
               CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado
          FROM SolicitudPermiso sp
          INNER JOIN Empleado e ON e.id = sp.empleadoId
         WHERE sp.estado = 'PENDIENTE' AND sp.tipo = 'VACACION'
         ORDER BY sp.id
         LIMIT 20
        """
    )

    if request.method == "POST":
        action = request.POST.get("action")
        confirm = request.POST.get("confirm") == "yes"

        if not confirm:
            messages.warning(request, "Debe confirmar la operación destructiva.")
            return redirect("database_demo:triggers")

        if action == "trigger1_capacitacion":
            cap_id = int(request.POST.get("capacitacion_id", 0))
            emp_id = int(request.POST.get("empleado_id", 0))
            method = request.POST.get("method", "sp")

            ctx["t1_before"] = run_select(
                """
                SELECT c.id, c.nombre, c.cupoMaximo,
                       (SELECT COUNT(*) FROM CapacitacionEmpleado ce
                         WHERE ce.capacitacionId = c.id) AS inscritos
                  FROM Capacitacion c WHERE c.id = %s
                """,
                (cap_id,),
            )
            ctx["t1_vista"] = run_select(
                "SELECT * FROM VistaCapacitaciones WHERE id = %s LIMIT 1",
                (cap_id,),
            )

            if method == "insert":
                ctx["t1_exec"] = run_statement(
                    """
                    INSERT INTO CapacitacionEmpleado
                      (capacitacionId, empleadoId, estado, createdAt)
                    VALUES (%s, %s, 'INSCRITO', NOW(3))
                    """,
                    (cap_id, emp_id),
                )
            else:
                ctx["t1_exec"] = run_call(
                    "sp_inscribir_capacitacion", (cap_id, emp_id)
                )

            ctx["t1_after"] = run_select(
                """
                SELECT c.id, c.nombre, c.cupoMaximo,
                       (SELECT COUNT(*) FROM CapacitacionEmpleado ce
                         WHERE ce.capacitacionId = c.id) AS inscritos
                  FROM Capacitacion c WHERE c.id = %s
                """,
                (cap_id,),
            )

        elif action == "trigger2_candidato":
            vacante_id = int(request.POST.get("vacante_id", 0))
            nombre = request.POST.get("nombre", "Test").strip()
            apellido = request.POST.get("apellido", "Demo").strip()
            email = request.POST.get("email", "").strip().lower()

            ctx["t2_before"] = run_select(
                """
                SELECT id, nombre, apellidoPaterno, email, vacanteId, etapa
                  FROM Candidato
                 WHERE LOWER(TRIM(email)) = %s AND vacanteId = %s
                """,
                (email, vacante_id),
            )

            ctx["t2_exec"] = run_statement(
                """
                INSERT INTO Candidato
                  (nombre, apellidoPaterno, email, vacanteId, etapa, updatedAt)
                VALUES (%s, %s, %s, %s, 'RECEPCION', NOW(3))
                """,
                (nombre, apellido, email, vacante_id),
            )

            ctx["t2_after"] = run_select(
                """
                SELECT id, nombre, apellidoPaterno, email, vacanteId, etapa
                  FROM Candidato
                 WHERE LOWER(TRIM(email)) = %s AND vacanteId = %s
                """,
                (email, vacante_id),
            )

        elif action == "trigger3_vacaciones":
            solicitud_id = int(request.POST.get("solicitud_id", 0))
            aprobador_id = int(
                request.POST.get("aprobado_por_id")
                or request.humanlink_user["user_id"]
            )
            respuesta = request.POST.get("respuesta", "Aprobada — demo BD")

            sol = run_select(
                """
                SELECT id, empleadoId, diasSolicitados, estado
                  FROM SolicitudPermiso WHERE id = %s
                """,
                (solicitud_id,),
            )
            empleado_id = None
            if sol.ok and sol.result_sets and sol.result_sets[0].rows:
                empleado_id = sol.result_sets[0].rows[0][1]

            if empleado_id:
                ctx["t3_before"] = run_select(
                    """
                    SELECT empleadoId, diasVacaciones, notas, updatedAt
                      FROM CalculoLaboralInfo WHERE empleadoId = %s
                    """,
                    (empleado_id,),
                )
                ctx["t3_saldo"] = run_call(
                    "sp_consultar_saldo_vacaciones", (empleado_id,)
                )

            ctx["t3_exec"] = run_call(
                "sp_aprobar_vacaciones",
                (solicitud_id, aprobador_id, respuesta),
            )

            if empleado_id:
                ctx["t3_after"] = run_select(
                    """
                    SELECT empleadoId, diasVacaciones, notas, updatedAt
                      FROM CalculoLaboralInfo WHERE empleadoId = %s
                    """,
                    (empleado_id,),
                )
                ctx["t3_solicitud"] = run_select(
                    "SELECT id, empleadoId, estado, diasSolicitados, respuesta "
                    "FROM SolicitudPermiso WHERE id = %s",
                    (solicitud_id,),
                )

        return render(request, "database_demo/triggers.html", ctx)

    return render(request, "database_demo/triggers.html", ctx)


@role_required(*DEMO_ROLES)
@require_http_methods(["GET", "POST"])
def procedures(request):
    sp_name = request.GET.get("sp") or request.POST.get("sp") or "sp_consultar_saldo_vacaciones"
    if sp_name not in STORED_PROCEDURES:
        sp_name = "sp_consultar_saldo_vacaciones"

    meta = STORED_PROCEDURES[sp_name]
    outcome = None
    params_used: list = []

    if request.method == "POST" and request.POST.get("action") == "execute_sp":
        confirm = request.POST.get("confirm") == "yes"
        if not confirm:
            messages.warning(request, "Confirme la ejecución del procedimiento.")
            return redirect(f"{request.path}?sp={sp_name}")

        for param in meta["params"]:
            raw = request.POST.get(param["name"], "")
            params_used.append(_coerce_param(raw, param["type"]))
        outcome = run_call(sp_name, params_used)

    return render(
        request,
        "database_demo/procedures.html",
        _demo_context(
            "procedures",
            procedures=STORED_PROCEDURES,
            selected_sp=sp_name,
            sp_meta=meta,
            outcome=outcome,
            params_used=params_used,
        ),
    )


@role_required(*DEMO_ROLES)
@require_http_methods(["GET", "POST"])
def db_views(request):
    vista = request.GET.get("vista") or request.POST.get("vista") or VISTA_NAMES[0]
    if vista not in VISTA_NAMES:
        vista = VISTA_NAMES[0]

    limit = int(request.GET.get("limit") or request.POST.get("limit") or 25)
    limit = max(1, min(limit, 100))

    outcome = None
    if request.method == "POST" and request.POST.get("action") == "query_view":
        sql = f"SELECT * FROM `{vista}` LIMIT %s"
        outcome = run_select(sql, (limit,))

    return render(
        request,
        "database_demo/views.html",
        _demo_context(
            "views",
            vistas=VISTA_NAMES,
            selected_vista=vista,
            limit=limit,
            outcome=outcome,
        ),
    )


@role_required(*DEMO_ROLES)
@require_http_methods(["GET", "POST"])
def queries(request):
    all_queries = parse_advanced_queries()
    qids = sorted(all_queries.keys(), key=lambda q: int(q[1:]))
    query_options = [(qid, all_queries[qid]["title"]) for qid in qids]
    selected = request.GET.get("q") or request.POST.get("q") or (qids[0] if qids else "Q1")
    if selected not in all_queries:
        selected = qids[0] if qids else "Q1"

    meta = all_queries.get(selected, {"title": "", "sql": ""})
    outcome = None

    if request.method == "POST" and request.POST.get("action") == "run_query":
        if meta.get("sql"):
            outcome = run_select(meta["sql"])

    return render(
        request,
        "database_demo/queries.html",
        _demo_context(
            "queries",
            query_ids=qids,
            query_options=query_options,
            queries=all_queries,
            selected_q=selected,
            query_meta=meta,
            outcome=outcome,
        ),
    )
