from datetime import datetime

from django.db.models import Count
from django.shortcuts import render
from django.utils import timezone

from core.auth_utils import get_empleado_for_user, login_required
from core.models import (
    Asistencia,
    Departamento,
    Empleado,
    EvaluacionDesempeno,
    EventoOrganizacional,
    Notificacion,
    QuejaLaboral,
    SolicitudPermiso,
    Vacante,
)


def _inicio_dia():
    now = timezone.localtime()
    return timezone.make_aware(datetime(now.year, now.month, now.day))


@login_required
def dashboard_view(request):
    user = request.humanlink_user
    rol = user["rol"]
    hoy = _inicio_dia()
    resumen = {}
    deptos = []
    notifs = []

    empleado = get_empleado_for_user(user)
    nombre = ""
    nombre_corto = ""
    if empleado:
        nombre = f"{empleado.nombre} {empleado.apellidoPaterno}"
        nombre_corto = empleado.nombre.split()[0] if empleado.nombre else ""

    if rol == "Empleado" and user.get("empleado_id"):
        eid = user["empleado_id"]
        proximo = (
            EventoOrganizacional.objects.filter(fecha__gte=hoy)
            .order_by("fecha")
            .values_list("titulo", flat=True)
            .first()
        )
        resumen = {
            "solicitudesPendientes": SolicitudPermiso.objects.filter(
                empleado_id=eid, estado="PENDIENTE"
            ).count(),
            "asistenciasHoy": Asistencia.objects.filter(empleado_id=eid, fecha=hoy).count(),
            "notificacionesNoLeidas": Notificacion.objects.filter(
                usuario_id=user["user_id"], leida=False
            ).count(),
            "proximoEvento": proximo,
        }
    elif rol == "Supervisor" and user.get("empleado_id"):
        dept_ids = list(
            Departamento.objects.filter(supervisor_id=user["empleado_id"]).values_list("id", flat=True)
        )
        resumen = {
            "equipoPendientes": SolicitudPermiso.objects.filter(
                empleado__departamento_id__in=dept_ids,
                aprobacionSupervisor="PENDIENTE",
                estado="PENDIENTE",
            ).count()
            if dept_ids
            else 0,
            "asistenciasHoy": Asistencia.objects.filter(
                empleado__departamento_id__in=dept_ids, fecha=hoy
            ).count()
            if dept_ids
            else 0,
            "evaluacionesPendientes": EvaluacionDesempeno.objects.filter(
                evaluador_id=user["empleado_id"]
            ).count(),
            "tamanoEquipo": Empleado.objects.filter(departamento_id__in=dept_ids, activo=True).count()
            if dept_ids
            else 0,
        }
    else:
        resumen = {
            "empleadosActivos": Empleado.objects.filter(activo=True).count(),
            "solicitudesPendientes": SolicitudPermiso.objects.filter(estado="PENDIENTE").count(),
            "quejasAbiertas": QuejaLaboral.objects.filter(
                estado__in=["REGISTRADA", "EN_REVISION"]
            ).count(),
            "vacantesAbiertas": Vacante.objects.filter(estado="ABIERTA").count(),
            "asistenciasHoy": Asistencia.objects.filter(fecha=hoy).count(),
            "notificacionesNoLeidas": Notificacion.objects.filter(
                usuario_id=user["user_id"], leida=False
            ).count(),
        }

        if rol in ("Administrador", "Recursos Humanos", "Supervisor"):
            deptos_qs = (
                Empleado.objects.filter(activo=True, departamento__isnull=False)
                .values(
                    "departamento__nombre",
                    "departamento__organizacion__nombre",
                )
                .annotate(empleados=Count("id"))
                .order_by("-empleados")
            )
            deptos = [
                {
                    "departamento": d["departamento__nombre"],
                    "organizacion": d["departamento__organizacion__nombre"] or "",
                    "empleados": d["empleados"],
                }
                for d in deptos_qs[:9]
            ]

    notifs = list(
        Notificacion.objects.filter(usuario_id=user["user_id"])
        .order_by("-createdAt")
        .values("id", "titulo", "mensaje", "leida", "createdAt")[:6]
    )

    kpi_labels = {
        "empleadosActivos": "Empleados activos",
        "solicitudesPendientes": "Solicitudes pendientes",
        "quejasAbiertas": "Quejas abiertas",
        "vacantesAbiertas": "Vacantes abiertas",
        "notificacionesNoLeidas": "Notificaciones",
        "equipoPendientes": "Aprobaciones pendientes",
        "asistenciasHoy": "Asistencias hoy",
        "evaluacionesPendientes": "Evaluaciones del equipo",
        "tamanoEquipo": "Tamaño del equipo",
        "proximoEvento": "Próximo evento",
    }
    kpi_links = {
        "empleadosActivos": "/empleados/",
        "solicitudesPendientes": "/solicitudes/",
        "quejasAbiertas": "/quejas/",
        "vacantesAbiertas": "/vacantes/",
        "notificacionesNoLeidas": "/notificaciones/",
        "equipoPendientes": "/solicitudes/",
        "asistenciasHoy": "/asistencias/",
        "evaluacionesPendientes": "/evaluaciones/",
        "tamanoEquipo": "/empleados/",
        "proximoEvento": "/eventos/",
    }

    if rol == "Empleado":
        accesos = [
            ("/solicitudes/", "Pedir permiso"),
            ("/vacaciones/", "Mis vacaciones"),
            ("/capacitaciones/", "Capacitaciones"),
            ("/eventos/", "Eventos"),
            ("/quejas/", "Quejas"),
            ("/perfil/", "Mi perfil"),
        ]
    elif rol == "Supervisor":
        accesos = [
            ("/solicitudes/", "Aprobar"),
            ("/asistencias/", "Asistencias"),
            ("/evaluaciones/", "Evaluar"),
            ("/reportes/", "Reportes"),
        ]
    else:
        accesos = [
            ("/empleados/", "Empleados"),
            ("/reportes/", "Reportes"),
            ("/vacantes/", "Vacantes"),
            ("/turnos/", "Turnos"),
        ]

    return render(
        request,
        "core/dashboard.html",
        {
            "rol": rol,
            "nombre": nombre_corto or nombre,
            "resumen": resumen,
            "kpi_labels": kpi_labels,
            "kpi_links": kpi_links,
            "deptos": deptos,
            "notifs": notifs,
            "accesos": accesos,
            "is_admin": rol in ("Administrador", "Recursos Humanos"),
            "is_empleado": rol == "Empleado",
        },
    )
