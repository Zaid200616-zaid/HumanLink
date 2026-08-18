from datetime import datetime, timedelta

from django.contrib import messages
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from core.auth_utils import (
    get_empleado_for_user,
    has_permission,
    login_required,
    permission_required,
)
from core.models import (
    Asistencia,
    Candidato,
    Capacitacion,
    CapacitacionEmpleado,
    Departamento,
    Documento,
    Empleado,
    EvaluacionDesempeno,
    EventoOrganizacional,
    EventoRespuesta,
    HistorialReporte,
    Notificacion,
    QuejaLaboral,
    Rol,
    SolicitudPermiso,
    Turno,
    Usuario,
    Vacante,
)
from core.services.acceso_turno import parse_minutos
from core.services.auditoria import registrar_auditoria
from core.services.email_service import notificar_usuario_id
from core.services.vacaciones import (
    calcular_dias_habiles,
    construir_expediente_vacaciones,
    hay_solapamiento,
)
from core.services.asistencias_sync import sincronizar_asistencias_solicitud
from core.services.workflows import requiere_supervisor_sync

MINUTOS_ANTES_REGISTRO = 30


def _list_ctx(title, columns, rows, **extra):
    ctx = {"page_title": title, "columns": columns, "rows": rows}
    ctx.update(extra)
    return ctx


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def _inicio_dia(fecha=None):
    ref = timezone.localtime(fecha or timezone.now())
    return timezone.make_aware(datetime(ref.year, ref.month, ref.day))


def _hora_actual_hhmm():
    now = timezone.localtime()
    return f"{now.hour:02d}:{now.minute:02d}"


def _minutos_actuales():
    now = timezone.localtime()
    return now.hour * 60 + now.minute


def _minutos_a_hhmm(total):
    h = (total // 60) % 24
    m = total % 60
    return f"{h:02d}:{m:02d}"


def _calcular_estado_entrada(hora_inicio_turno, hora_entrada):
    start = parse_minutos(hora_inicio_turno)
    entrada = parse_minutos(hora_entrada)
    return "PUNTUAL" if entrada <= start else "RETARDO"


def _validar_ventana_registro(turno):
    now = _minutos_actuales()
    start = parse_minutos(turno.horaInicio)
    earliest = start - MINUTOS_ANTES_REGISTRO
    if now < earliest:
        return False, f"El registro de entrada estará disponible a partir de las {_minutos_a_hhmm(earliest)}."
    end = parse_minutos(turno.horaFin)
    if start <= end and now > end:
        return False, "El horario de tu turno para hoy ya finalizó. Contacta a Recursos Humanos si necesitas apoyo."
    return True, ""


def _notificar_supervisor(empleado_id, mensaje):
    try:
        emp = Empleado.objects.select_related("departamento").get(id=empleado_id)
    except Empleado.DoesNotExist:
        return
    if not emp.departamento or not emp.departamento.supervisor_id:
        return
    try:
        sup = Empleado.objects.select_related("usuario").get(id=emp.departamento.supervisor_id)
    except Empleado.DoesNotExist:
        return
    if sup.usuario_id:
        notificar_usuario_id(
            sup.usuario_id,
            "Solicitud pendiente de tu equipo",
            mensaje,
            "SOLICITUD",
        )


def _notificar_rh(titulo, mensaje):
    usuarios = Usuario.objects.filter(rol__nombre__in=["Recursos Humanos", "Administrador"])
    for u in usuarios:
        notificar_usuario_id(u.id, titulo, mensaje, "SOLICITUD")


# --- Empleados ---


@login_required
@permission_required("empleados:read")
def empleados_list(request):
    qs = Empleado.objects.select_related("departamento").filter(activo=True).order_by("nombre")
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(
            Q(nombre__icontains=q)
            | Q(apellidoPaterno__icontains=q)
            | Q(email__icontains=q)
            | Q(numeroEmpleado__icontains=q)
        )
    rows = [
        {
            "id": e.id,
            "numero": e.numeroEmpleado,
            "nombre": f"{e.nombre} {e.apellidoPaterno}",
            "puesto": e.puesto,
            "departamento": e.departamento.nombre if e.departamento else "—",
            "detail_url": f"/empleados/{e.id}/",
        }
        for e in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Empleados",
            [
                {"key": "numero", "label": "No."},
                {"key": "nombre", "label": "Nombre"},
                {"key": "puesto", "label": "Puesto"},
                {"key": "departamento", "label": "Departamento"},
            ],
            rows,
            detail_key="detail_url",
        ),
    )


@login_required
@permission_required("empleados:read")
def empleado_detail(request, pk):
    empleado = get_object_or_404(
        Empleado.objects.select_related("departamento__organizacion", "turno", "usuario"),
        pk=pk,
    )
    return render(request, "core/empleado_detail.html", {"empleado": empleado})


# --- Departamentos ---


@login_required
@permission_required("departamentos:read")
def departamentos_list(request):
    qs = Departamento.objects.select_related("organizacion", "supervisor").filter(activo=True)
    rows = [
        {
            "id": d.id,
            "nombre": d.nombre,
            "organizacion": d.organizacion.nombre if d.organizacion else "—",
            "supervisor": str(d.supervisor) if d.supervisor else "—",
            "detail_url": f"/departamentos/{d.id}/",
        }
        for d in qs
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Departamentos",
            [
                {"key": "nombre", "label": "Departamento"},
                {"key": "organizacion", "label": "Organización"},
                {"key": "supervisor", "label": "Supervisor"},
            ],
            rows,
            detail_key="detail_url",
        ),
    )


@login_required
@permission_required("departamentos:read")
def departamento_detail(request, pk):
    depto = get_object_or_404(
        Departamento.objects.select_related("organizacion", "supervisor"),
        pk=pk,
    )
    empleados = Empleado.objects.filter(departamento=depto, activo=True)[:50]
    vacantes = Vacante.objects.filter(departamento=depto).order_by("-fechaPublicacion")[:20]
    return render(
        request,
        "core/departamento_detail.html",
        {"departamento": depto, "empleados": empleados, "vacantes": vacantes},
    )


# --- Documentos ---


@login_required
@permission_required("documentos:read")
def documentos_list(request):
    qs = Documento.objects.select_related("empleado").filter(activo=True).order_by("-createdAt")
    rows = [
        {
            "nombre": d.nombre,
            "tipo": d.tipo,
            "empleado": str(d.empleado) if d.empleado else "—",
            "fecha": d.createdAt.strftime("%d/%m/%Y") if d.createdAt else "—",
        }
        for d in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Documentos",
            [
                {"key": "nombre", "label": "Nombre"},
                {"key": "tipo", "label": "Tipo"},
                {"key": "empleado", "label": "Empleado"},
                {"key": "fecha", "label": "Fecha"},
            ],
            rows,
        ),
    )


# --- Turnos ---


@login_required
@permission_required("turnos:read")
def turnos_list(request):
    qs = Turno.objects.filter(activo=True).order_by("nombre")
    rows = [
        {
            "nombre": t.nombre,
            "horario": f"{t.horaInicio} – {t.horaFin}",
            "descripcion": (t.descripcion or "—")[:60],
        }
        for t in qs
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Turnos Laborales",
            [
                {"key": "nombre", "label": "Turno"},
                {"key": "horario", "label": "Horario"},
                {"key": "descripcion", "label": "Descripción"},
            ],
            rows,
        ),
    )


# --- Solicitudes ---


@login_required
def solicitudes_list(request):
    user = request.humanlink_user
    permisos = user["permisos"]
    rol = user["rol"]
    estado = request.GET.get("estado")
    vista = request.GET.get("vista")

    if request.method == "POST":
        action = request.POST.get("action")
        if action == "crear":
            if not has_permission(permisos, "solicitudes:write"):
                messages.error(request, "Sin permisos para crear solicitudes.")
            elif not user.get("empleado_id"):
                messages.error(request, "Usuario sin empleado asociado")
            else:
                tipo = request.POST.get("tipo")
                fecha_inicio = _parse_date(request.POST.get("fecha_inicio"))
                fecha_fin = _parse_date(request.POST.get("fecha_fin"))
                motivo = (request.POST.get("motivo") or "").strip()
                if tipo not in ("PERMISO", "VACACION"):
                    messages.error(request, "Tipo de solicitud inválido.")
                elif not fecha_inicio or not fecha_fin:
                    messages.error(request, "Fechas inválidas.")
                elif fecha_fin < fecha_inicio:
                    messages.error(request, "La fecha fin debe ser posterior a la fecha inicio")
                elif len(motivo) < 10:
                    messages.error(request, "El motivo debe tener al menos 10 caracteres.")
                else:
                    dias = calcular_dias_habiles(fecha_inicio, fecha_fin)
                    if dias == 0:
                        messages.error(request, "El rango debe incluir al menos un día hábil")
                    else:
                        empleado = get_object_or_404(
                            Empleado.objects.select_related("departamento__organizacion"),
                            id=user["empleado_id"],
                        )
                        org = empleado.departamento.organizacion if empleado.departamento else None
                        if (
                            org
                            and tipo == "VACACION"
                            and dias > org.maxDiasConsecutivosVacacion
                        ):
                            messages.error(
                                request,
                                f"Máximo {org.maxDiasConsecutivosVacacion} días consecutivos según política",
                            )
                        else:
                            dias_antes = org.diasAnticipacionVacacion if org else 7
                            hoy = _inicio_dia()
                            diff = (fecha_inicio.date() - hoy.date()).days
                            if tipo == "VACACION" and diff < dias_antes:
                                messages.error(
                                    request,
                                    f"Solicita con al menos {dias_antes} días de anticipación",
                                )
                            else:
                                existentes = list(
                                    SolicitudPermiso.objects.filter(empleado_id=user["empleado_id"])
                                )
                                if hay_solapamiento(existentes, fecha_inicio, fecha_fin):
                                    messages.error(request, "Ya existe una solicitud en esas fechas")
                                elif tipo == "VACACION":
                                    exp = construir_expediente_vacaciones(empleado, existentes)
                                    if exp["dias_disponibles"] < dias:
                                        messages.error(
                                            request,
                                            f"Saldo insuficiente: {exp['dias_disponibles']} días disponibles",
                                        )
                                    else:
                                        _crear_solicitud(
                                            request, empleado, user, tipo, fecha_inicio, fecha_fin, dias, motivo
                                        )
                                else:
                                    _crear_solicitud(
                                        request, empleado, user, tipo, fecha_inicio, fecha_fin, dias, motivo
                                    )

        elif action in ("supervisor", "rh"):
            sid = request.POST.get("solicitud_id")
            estado_accion = request.POST.get("estado")
            respuesta = (request.POST.get("respuesta") or "").strip()
            if not sid:
                messages.error(request, "Solicitud no especificada.")
            else:
                solicitud = get_object_or_404(
                    SolicitudPermiso.objects.select_related(
                        "empleado__departamento", "empleado__usuario"
                    ),
                    pk=int(sid),
                )
                if solicitud.estado != "PENDIENTE":
                    messages.error(request, "Esta solicitud ya fue resuelta")
                elif action == "supervisor":
                    _aprobar_supervisor(request, user, solicitud, estado_accion, respuesta)
                else:
                    _aprobar_rh(request, user, solicitud, estado_accion, respuesta)

        return redirect("solicitudes")

    qs = SolicitudPermiso.objects.select_related(
        "empleado__departamento__organizacion"
    ).order_by("-createdAt")
    if estado:
        qs = qs.filter(estado=estado)

    if rol == "Empleado" and user.get("empleado_id"):
        qs = qs.filter(empleado_id=user["empleado_id"])
    elif rol == "Supervisor" and user.get("empleado_id"):
        dept_ids = list(
            Departamento.objects.filter(supervisor_id=user["empleado_id"]).values_list("id", flat=True)
        )
        if not dept_ids:
            qs = qs.none()
        else:
            qs = qs.filter(empleado__departamento_id__in=dept_ids)
            if vista == "equipo":
                qs = qs.filter(aprobacionSupervisor="PENDIENTE", estado="PENDIENTE")

    solicitudes = list(qs[:100])
    puede_crear = has_permission(permisos, "solicitudes:write") and bool(user.get("empleado_id"))
    puede_rh = rol in ("Administrador", "Recursos Humanos") and has_permission(
        permisos, "solicitudes:*"
    )
    empleado_id = user.get("empleado_id")

    return render(
        request,
        "core/solicitudes.html",
        {
            "solicitudes": solicitudes,
            "puede_crear": puede_crear,
            "puede_rh": puede_rh,
            "rol": rol,
            "empleado_id": empleado_id,
            "vista_equipo": vista == "equipo",
        },
    )


def _crear_solicitud(request, empleado, user, tipo, fecha_inicio, fecha_fin, dias, motivo):
    tiene_supervisor_depto = bool(
        empleado.departamento
        and empleado.departamento.supervisor_id
        and empleado.departamento.supervisor_id != user["empleado_id"]
    )
    tiene_supervisor = requiere_supervisor_sync("SOLICITUDES", tiene_supervisor_depto)
    now = timezone.now()
    solicitud = SolicitudPermiso.objects.create(
        empleado_id=user["empleado_id"],
        tipo=tipo,
        fechaInicio=fecha_inicio,
        fechaFin=fecha_fin,
        diasSolicitados=dias,
        motivo=motivo,
        aprobacionSupervisor="PENDIENTE" if tiene_supervisor else "NO_APLICA",
        estado="PENDIENTE",
        createdAt=now,
        updatedAt=now,
    )
    msg = f"{empleado.nombre} solicitó {tipo.lower()} ({dias} días)"
    if tiene_supervisor:
        _notificar_supervisor(user["empleado_id"], msg)
    else:
        _notificar_rh("Nueva solicitud de permiso", msg)
    registrar_auditoria(user["user_id"], user["email"], "CREAR", "solicitudes", f"Solicitud {solicitud.id}")
    messages.success(request, "Solicitud registrada correctamente.")


def _aprobar_supervisor(request, user, solicitud, estado, respuesta):
    if not user.get("empleado_id"):
        messages.error(request, "Sin permisos de supervisor")
        return
    sup_id = solicitud.empleado.departamento.supervisor_id if solicitud.empleado.departamento else None
    if sup_id != user["empleado_id"]:
        messages.error(request, "No supervisas a este empleado")
        return
    if estado not in ("APROBADA", "RECHAZADA"):
        messages.error(request, "Estado inválido")
        return
    sup_estado = "APROBADO" if estado == "APROBADA" else "RECHAZADO"
    resp_sup = respuesta or (
        "Aprobado por supervisor" if sup_estado == "APROBADO" else "Rechazado por supervisor"
    )
    now = timezone.now()
    data = {
        "aprobacionSupervisor": sup_estado,
        "supervisorRespuesta": resp_sup,
        "supervisorAprobadoPorId": user["empleado_id"],
        "supervisorFechaResolucion": now,
        "updatedAt": now,
    }
    if sup_estado == "RECHAZADO":
        data.update({"estado": "RECHAZADA", "respuesta": resp_sup, "fechaResolucion": now})
    SolicitudPermiso.objects.filter(id=solicitud.id).update(**data)
    if sup_estado == "APROBADO":
        _notificar_rh(
            "Solicitud aprobada por supervisor",
            f"{solicitud.empleado.nombre}: pendiente confirmación RH",
        )
    elif solicitud.empleado.usuario_id:
        notificar_usuario_id(
            solicitud.empleado.usuario_id,
            "Solicitud rechazada",
            resp_sup,
            "SOLICITUD",
        )
    registrar_auditoria(
        user["user_id"], user["email"], "SUPERVISOR", "solicitudes", f"ID {solicitud.id} → {sup_estado}"
    )
    messages.success(request, f"Solicitud {sup_estado.lower()} por supervisor.")


def _aprobar_rh(request, user, solicitud, estado, respuesta):
    rol = user["rol"]
    permisos = user["permisos"]
    puede = (rol in ("Administrador", "Recursos Humanos")) and has_permission(
        permisos, "solicitudes:*"
    )
    if not puede:
        messages.error(request, "Sin permisos")
        return
    if estado not in ("APROBADA", "RECHAZADA"):
        messages.error(request, "Estado inválido")
        return
    if solicitud.aprobacionSupervisor == "PENDIENTE":
        messages.error(request, "Pendiente de aprobación del supervisor")
        return
    if solicitud.aprobacionSupervisor == "RECHAZADO":
        messages.error(request, "Rechazada por el supervisor")
        return
    if estado == "APROBADA" and solicitud.tipo == "VACACION":
        todas = list(SolicitudPermiso.objects.filter(empleado_id=solicitud.empleado_id))
        exp = construir_expediente_vacaciones(solicitud.empleado, todas, solicitud.id)
        if not exp["puede_autorizar"]:
            messages.error(
                request, f"Saldo insuficiente: {exp['dias_disponibles']} días disponibles"
            )
            return
    respuesta_final = respuesta or (
        "Aprobada por Recursos Humanos" if estado == "APROBADA" else "Rechazada por Recursos Humanos"
    )
    now = timezone.now()
    SolicitudPermiso.objects.filter(id=solicitud.id).update(
        estado=estado,
        respuesta=respuesta_final,
        aprobadoPorId=user.get("empleado_id"),
        fechaResolucion=now,
        updatedAt=now,
    )
    if estado == "APROBADA":
        sincronizar_asistencias_solicitud(
            solicitud.empleado_id,
            solicitud.fechaInicio,
            solicitud.fechaFin,
            solicitud.tipo,
        )
    if solicitud.empleado.usuario_id:
        notificar_usuario_id(
            solicitud.empleado.usuario_id,
            "Solicitud aprobada" if estado == "APROBADA" else "Solicitud rechazada",
            respuesta_final,
            "SOLICITUD",
        )
    registrar_auditoria(user["user_id"], user["email"], estado, "solicitudes", f"ID {solicitud.id}")
    messages.success(request, f"Solicitud {estado.lower()} por RH.")


# --- Vacaciones expediente ---


@login_required
def vacaciones_expediente(request, empleado_id=None):
    user = request.humanlink_user
    rol = user["rol"]
    permisos = user["permisos"]

    if empleado_id is None:
        if rol == "Empleado" and user.get("empleado_id"):
            empleado_id = user["empleado_id"]
        else:
            empleados = Empleado.objects.filter(activo=True).order_by("nombre")[:100]
            return render(request, "core/vacaciones_selector.html", {"empleados": empleados})

    empleado = get_object_or_404(Empleado.objects.select_related("departamento"), pk=empleado_id)

    if rol == "Empleado" and user.get("empleado_id") != empleado.id:
        messages.error(request, "Solo puedes consultar tu expediente.")
        return redirect("vacaciones")

    if rol == "Supervisor" and user.get("empleado_id"):
        dept_ids = list(
            Departamento.objects.filter(supervisor_id=user["empleado_id"]).values_list("id", flat=True)
        )
        if empleado.departamento_id not in dept_ids:
            messages.error(request, "No tienes acceso a este expediente.")
            return redirect("vacaciones")

    if rol not in ("Administrador", "Recursos Humanos", "Supervisor", "Empleado"):
        messages.error(request, "Sin permisos.")
        return redirect("dashboard")

    if rol in ("Administrador", "Recursos Humanos") and not (
        has_permission(permisos, "solicitudes:read") or has_permission(permisos, "empleados:read")
    ):
        messages.error(request, "Sin permisos.")
        return redirect("dashboard")

    solicitudes = list(SolicitudPermiso.objects.filter(empleado=empleado).order_by("-createdAt"))
    expediente = construir_expediente_vacaciones(empleado, solicitudes)
    return render(
        request,
        "core/vacaciones_expediente.html",
        {"empleado": empleado, "expediente": expediente},
    )


# --- Vacantes ---


@login_required
@permission_required("vacantes:read")
def vacantes_list(request):
    qs = Vacante.objects.select_related("departamento").order_by("-fechaPublicacion")
    rows = [
        {
            "titulo": v.titulo,
            "departamento": v.departamento.nombre if v.departamento else "—",
            "estado": v.estado,
            "cupo": f"{v.cupoDisponible}/{v.cupoTotal}",
        }
        for v in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Vacantes",
            [
                {"key": "titulo", "label": "Título"},
                {"key": "departamento", "label": "Departamento"},
                {"key": "estado", "label": "Estado"},
                {"key": "cupo", "label": "Cupo"},
            ],
            rows,
        ),
    )


# --- Candidatos ---


@login_required
@permission_required("candidatos:read")
def candidatos_list(request):
    qs = Candidato.objects.select_related("vacante").order_by("-createdAt")
    rows = [
        {
            "nombre": f"{c.nombre} {c.apellidoPaterno}",
            "email": c.email,
            "vacante": c.vacante.titulo if c.vacante else "—",
            "etapa": c.etapa,
        }
        for c in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Contrataciones",
            [
                {"key": "nombre", "label": "Candidato"},
                {"key": "email", "label": "Correo"},
                {"key": "vacante", "label": "Vacante"},
                {"key": "etapa", "label": "Etapa"},
            ],
            rows,
        ),
    )


# --- Capacitaciones ---


@login_required
def capacitaciones_list(request):
    user = request.humanlink_user
    if request.method == "POST" and request.POST.get("action") == "inscribir":
        cap_id = request.POST.get("capacitacion_id")
        if not user.get("empleado_id"):
            messages.error(request, "Usuario sin empleado asociado")
        elif not cap_id:
            messages.error(request, "Capacitación no especificada")
        else:
            cap = get_object_or_404(Capacitacion, pk=int(cap_id))
            inscritos = CapacitacionEmpleado.objects.filter(capacitacion=cap).count()
            if inscritos >= cap.cupoMaximo:
                messages.error(request, "No hay cupo disponible en esta capacitación")
            elif CapacitacionEmpleado.objects.filter(
                capacitacion=cap, empleado_id=user["empleado_id"]
            ).exists():
                messages.error(request, "Ya estás inscrito en esta capacitación")
            else:
                CapacitacionEmpleado.objects.create(
                    capacitacion=cap,
                    empleado_id=user["empleado_id"],
                    estado="INSCRITO",
                    createdAt=timezone.now(),
                )
                notificar_usuario_id(
                    user["user_id"],
                    "Inscripción confirmada",
                    f"Te inscribiste en: {cap.nombre}",
                    "CAPACITACION",
                )
                messages.success(request, f"Inscripción confirmada en {cap.nombre}")
        return redirect("capacitaciones")

    caps = Capacitacion.objects.annotate(inscritos=Count("empleados")).order_by("-fechaInicio")
    inscripciones = set()
    if user.get("empleado_id"):
        inscripciones = set(
            CapacitacionEmpleado.objects.filter(empleado_id=user["empleado_id"]).values_list(
                "capacitacion_id", flat=True
            )
        )
    return render(
        request,
        "core/capacitaciones.html",
        {"capacitaciones": caps[:50], "inscripciones": inscripciones, "empleado_id": user.get("empleado_id")},
    )


# --- Evaluaciones ---


@login_required
def evaluaciones_list(request):
    user = request.humanlink_user
    qs = EvaluacionDesempeno.objects.select_related("empleado", "evaluador").order_by("-fecha")
    if user["rol"] == "Empleado" and user.get("empleado_id"):
        qs = qs.filter(empleado_id=user["empleado_id"])
    elif user["rol"] == "Supervisor" and user.get("empleado_id"):
        qs = qs.filter(evaluador_id=user["empleado_id"])
    rows = [
        {
            "empleado": str(e.empleado),
            "evaluador": str(e.evaluador),
            "periodo": e.periodo,
            "calificacion": e.puntaje if e.puntaje is not None else "—",
            "fecha": e.fecha.strftime("%d/%m/%Y") if e.fecha else "—",
        }
        for e in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Evaluaciones de Desempeño",
            [
                {"key": "empleado", "label": "Empleado"},
                {"key": "evaluador", "label": "Evaluador"},
                {"key": "periodo", "label": "Periodo"},
                {"key": "calificacion", "label": "Calificación"},
                {"key": "fecha", "label": "Fecha"},
            ],
            rows,
        ),
    )


# --- Eventos ---


@login_required
def eventos_list(request):
    qs = EventoOrganizacional.objects.order_by("-fecha")[:100]
    rows = [
        {
            "titulo": e.titulo,
            "fecha": e.fecha.strftime("%d/%m/%Y %H:%M") if e.fecha else "—",
            "ubicacion": e.ubicacion or "—",
            "inscripcion": "Abierta" if e.inscripcionAbierta else "Cerrada",
        }
        for e in qs
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Eventos Organizacionales",
            [
                {"key": "titulo", "label": "Evento"},
                {"key": "fecha", "label": "Fecha"},
                {"key": "ubicacion", "label": "Ubicación"},
                {"key": "inscripcion", "label": "Inscripción"},
            ],
            rows,
        ),
    )


# --- Quejas ---


@login_required
def quejas_list(request):
    user = request.humanlink_user
    qs = QuejaLaboral.objects.select_related("empleado").order_by("-createdAt")
    if user["rol"] == "Empleado" and user.get("empleado_id"):
        qs = qs.filter(empleado_id=user["empleado_id"])
    rows = [
        {
            "asunto": q.asunto,
            "empleado": str(q.empleado) if q.empleado else "Anónimo",
            "estado": q.estado,
            "fecha": q.createdAt.strftime("%d/%m/%Y") if q.createdAt else "—",
        }
        for q in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Quejas Laborales",
            [
                {"key": "asunto", "label": "Asunto"},
                {"key": "empleado", "label": "Empleado"},
                {"key": "estado", "label": "Estado"},
                {"key": "fecha", "label": "Fecha"},
            ],
            rows,
        ),
    )


# --- Reportes ---


@login_required
@permission_required("reportes:read")
def reportes_view(request):
    mes = request.GET.get("mes") or timezone.localtime().strftime("%Y-%m")
    try:
        y, m = map(int, mes.split("-"))
        inicio = timezone.make_aware(datetime(y, m, 1))
        if m == 12:
            fin = timezone.make_aware(datetime(y + 1, 1, 1)) - timedelta(seconds=1)
        else:
            fin = timezone.make_aware(datetime(y, m + 1, 1)) - timedelta(seconds=1)
    except (ValueError, TypeError):
        inicio = _inicio_dia()
        fin = timezone.now()

    stats = {
        "empleados_activos": Empleado.objects.filter(activo=True).count(),
        "solicitudes_pendientes": SolicitudPermiso.objects.filter(estado="PENDIENTE").count(),
        "asistencias_mes": Asistencia.objects.filter(fecha__gte=inicio, fecha__lte=fin).count(),
        "quejas_abiertas": QuejaLaboral.objects.filter(
            estado__in=["REGISTRADA", "EN_REVISION"]
        ).count(),
        "vacantes_abiertas": Vacante.objects.filter(estado="ABIERTA").count(),
    }
    return render(request, "core/reportes.html", {"stats": stats, "mes": mes})


@login_required
@permission_required("reportes:read")
def reportes_historial(request):
    qs = HistorialReporte.objects.select_related("usuario").order_by("-createdAt")[:50]
    rows = [
        {
            "tipo": h.tipo,
            "mes": h.mes,
            "usuario": h.usuario.email if h.usuario else "—",
            "fecha": h.createdAt.strftime("%d/%m/%Y %H:%M") if h.createdAt else "—",
        }
        for h in qs
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Historial de Reportes",
            [
                {"key": "tipo", "label": "Tipo"},
                {"key": "mes", "label": "Mes"},
                {"key": "usuario", "label": "Usuario"},
                {"key": "fecha", "label": "Fecha"},
            ],
            rows,
        ),
    )


# --- Permisos rol ---


@login_required
def permisos_rol(request):
    if request.humanlink_user["rol"] != "Administrador":
        messages.error(request, "Solo administradores pueden gestionar roles.")
        return redirect("dashboard")
    roles = Rol.objects.all().order_by("nombre")
    usuarios = Usuario.objects.select_related("rol").filter(activo=True).order_by("email")
    return render(request, "core/permisos_rol.html", {"roles": roles, "usuarios": usuarios})


# --- Perfil ---


@login_required
def perfil_view(request):
    user = request.humanlink_user
    empleado = get_empleado_for_user(user)
    notifs_count = Notificacion.objects.filter(usuario_id=user["user_id"], leida=False).count()
    return render(
        request,
        "core/perfil.html",
        {"empleado": empleado, "usuario": user["usuario"], "notifs_count": notifs_count},
    )


# --- Buscar ---


@login_required
def buscar_view(request):
    q = (request.GET.get("q") or "").strip()
    resultados = {"empleados": [], "vacantes": [], "candidatos": [], "departamentos": [], "documentos": []}
    user = request.humanlink_user
    permisos = user["permisos"]

    if len(q) >= 2:
        resultados["empleados"] = list(
            Empleado.objects.filter(
                Q(nombre__icontains=q)
                | Q(apellidoPaterno__icontains=q)
                | Q(email__icontains=q)
                | Q(numeroEmpleado__icontains=q),
                activo=True,
            ).values("id", "nombre", "apellidoPaterno", "puesto", "numeroEmpleado")[:8]
        )
        puede_recl = user["rol"] != "Empleado" and (
            has_permission(permisos, "vacantes:read")
            or has_permission(permisos, "candidatos:read")
            or has_permission(permisos, "vacantes:*")
            or has_permission(permisos, "candidatos:*")
        )
        if puede_recl:
            resultados["vacantes"] = list(
                Vacante.objects.filter(titulo__icontains=q).values("id", "titulo", "estado")[:5]
            )
            resultados["candidatos"] = list(
                Candidato.objects.filter(Q(nombre__icontains=q) | Q(email__icontains=q)).values(
                    "id", "nombre", "apellidoPaterno", "etapa"
                )[:5]
            )
        if has_permission(permisos, "departamentos:read") or has_permission(
            permisos, "departamentos:*"
        ):
            resultados["departamentos"] = list(
                Departamento.objects.filter(
                    Q(nombre__icontains=q) | Q(descripcion__icontains=q),
                    activo=True,
                ).values("id", "nombre")[:5]
            )
        if has_permission(permisos, "documentos:read") or has_permission(permisos, "documentos:*"):
            resultados["documentos"] = list(
                Documento.objects.filter(
                    Q(nombre__icontains=q) | Q(tipo__icontains=q),
                    activo=True,
                ).values("id", "nombre", "tipo")[:5]
            )
    elif q:
        messages.warning(request, "Ingrese al menos 2 caracteres para buscar.")

    return render(request, "core/buscar.html", {"q": q, "resultados": resultados})


# --- Notificaciones ---


@login_required
def notificaciones_list(request):
    user = request.humanlink_user
    if request.method == "POST" and request.POST.get("action") == "marcar_leida":
        nid = request.POST.get("notificacion_id")
        if nid:
            Notificacion.objects.filter(id=nid, usuario_id=user["user_id"]).update(leida=True)
            messages.success(request, "Notificación marcada como leída.")
        return redirect("notificaciones")

    notifs = Notificacion.objects.filter(usuario_id=user["user_id"]).order_by("-createdAt")[:50]
    return render(request, "core/notificaciones.html", {"notificaciones": notifs})


# --- Asistencias ---


@login_required
def asistencias_list(request):
    user = request.humanlink_user
    qs = Asistencia.objects.select_related("empleado").order_by("-fecha")
    if user["rol"] == "Empleado" and user.get("empleado_id"):
        qs = qs.filter(empleado_id=user["empleado_id"])
    elif user["rol"] == "Supervisor" and user.get("empleado_id"):
        dept_ids = list(
            Departamento.objects.filter(supervisor_id=user["empleado_id"]).values_list("id", flat=True)
        )
        qs = qs.filter(empleado__departamento_id__in=dept_ids) if dept_ids else qs.none()
    rows = [
        {
            "empleado": str(a.empleado),
            "fecha": a.fecha.strftime("%d/%m/%Y") if a.fecha else "—",
            "entrada": a.horaEntrada or "—",
            "salida": a.horaSalida or "—",
            "estado": a.estado,
        }
        for a in qs[:100]
    ]
    return render(
        request,
        "core/list.html",
        _list_ctx(
            "Asistencias",
            [
                {"key": "empleado", "label": "Empleado"},
                {"key": "fecha", "label": "Fecha"},
                {"key": "entrada", "label": "Entrada"},
                {"key": "salida", "label": "Salida"},
                {"key": "estado", "label": "Estado"},
            ],
            rows,
        ),
    )


# --- Registro entrada ---


@login_required
def registro_entrada(request):
    user = request.humanlink_user
    empleado = get_empleado_for_user(user)
    asistencia_hoy = None

    if empleado:
        hoy = _inicio_dia()
        asistencia_hoy = Asistencia.objects.filter(empleado=empleado, fecha=hoy).first()

    if request.method == "POST":
        if not has_permission(user["permisos"], "asistencias:read"):
            messages.error(request, "Sin permisos para registrar asistencia.")
        elif not user.get("empleado_id"):
            messages.error(
                request, "Tu usuario no está vinculado a un empleado. Contacta a Recursos Humanos."
            )
        elif not empleado or not empleado.activo:
            messages.error(request, "No se puede registrar asistencia para un empleado inactivo.")
        elif not empleado.turno:
            messages.error(
                request,
                "No tienes un turno asignado. Solicita a Recursos Humanos que configure tu horario.",
            )
        else:
            ok, msg = _validar_ventana_registro(empleado.turno)
            if not ok:
                messages.error(request, msg)
            elif asistencia_hoy:
                messages.error(request, "Ya registraste tu asistencia el día de hoy.")
            else:
                hora = _hora_actual_hhmm()
                estado = _calcular_estado_entrada(empleado.turno.horaInicio, hora)
                now = timezone.now()
                Asistencia.objects.create(
                    empleado=empleado,
                    fecha=_inicio_dia(),
                    horaEntrada=hora,
                    estado=estado,
                    turnoNombre=empleado.turno.nombre,
                    notas="Registro automático de entrada",
                    createdAt=now,
                    updatedAt=now,
                )
                messages.success(request, f"Entrada registrada a las {hora} ({estado}).")
                return redirect("registro_entrada")

    return render(
        request,
        "core/registro_entrada.html",
        {"empleado": empleado, "asistencia_hoy": asistencia_hoy},
    )


# --- Postular (público) ---


def postular_view(request):
    vacantes = Vacante.objects.filter(estado="ABIERTA", cupoDisponible__gt=0).select_related(
        "departamento"
    )

    if request.method == "POST":
        nombre = (request.POST.get("nombre") or "").strip()
        apellido = (request.POST.get("apellido_paterno") or "").strip()
        email = (request.POST.get("email") or "").strip()
        vacante_id = request.POST.get("vacante_id")
        if not nombre or not apellido or not email or not vacante_id:
            messages.error(request, "Complete todos los campos obligatorios")
        else:
            vacante = get_object_or_404(Vacante, pk=int(vacante_id), estado="ABIERTA")
            now = timezone.now()
            Candidato.objects.create(
                nombre=nombre,
                apellidoPaterno=apellido,
                apellidoMaterno=(request.POST.get("apellido_materno") or "").strip() or None,
                email=email,
                telefono=(request.POST.get("telefono") or "").strip() or None,
                curp=(request.POST.get("curp") or "").strip() or None,
                vacante=vacante,
                etapa="RECEPCION",
                createdAt=now,
                updatedAt=now,
            )
            messages.success(request, "Postulación enviada correctamente. Recursos Humanos revisará tu solicitud.")
            return redirect("postular")

    return render(request, "core/postular.html", {"vacantes": vacantes})
