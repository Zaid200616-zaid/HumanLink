from datetime import date, datetime, timedelta

from core.models import Empleado, SolicitudPermiso


def calcular_dias_habiles(inicio: datetime, fin: datetime) -> int:
    start = inicio.replace(hour=0, minute=0, second=0, microsecond=0)
    end = fin.replace(hour=0, minute=0, second=0, microsecond=0)
    if end < start:
        return 0
    dias = 0
    cur = start
    while cur <= end:
        if cur.weekday() < 5:
            dias += 1
        cur += timedelta(days=1)
    return dias


def calcular_dias_vacaciones_anuales(fecha_ingreso: datetime) -> int:
    hoy = datetime.now()
    ingreso = fecha_ingreso
    años = hoy.year - ingreso.year
    cumple = (hoy.month, hoy.day) >= (ingreso.month, ingreso.day)
    if not cumple:
        años -= 1
    if años < 1:
        return 12
    if años == 1:
        return 12
    if años == 2:
        return 14
    if años == 3:
        return 16
    if años == 4:
        return 18
    if años == 5:
        return 20
    if 6 <= años <= 10:
        return 22
    if 11 <= años <= 15:
        return 24
    if 16 <= años <= 20:
        return 26
    if 21 <= años <= 25:
        return 28
    if 26 <= años <= 30:
        return 30
    return 32


def calcular_antiguedad(fecha_ingreso: datetime) -> dict:
    hoy = datetime.now()
    ingreso = fecha_ingreso
    años = hoy.year - ingreso.year
    meses = hoy.month - ingreso.month
    if meses < 0:
        años -= 1
        meses += 12
    if hoy.day < ingreso.day and meses == 0:
        años -= 1
        meses = 11
    elif hoy.day < ingreso.day:
        meses -= 1
    return {"años": años, "meses": meses}


def hay_solapamiento(solicitudes, inicio: datetime, fin: datetime, excluir_id=None) -> bool:
    for s in solicitudes:
        if s.estado == "RECHAZADA":
            continue
        if excluir_id and s.id == excluir_id:
            continue
        if inicio <= s.fechaFin and fin >= s.fechaInicio:
            return True
    return False


def construir_expediente_vacaciones(empleado: Empleado, solicitudes, solicitud_actual_id=None):
    dias_anuales = calcular_dias_vacaciones_anuales(empleado.fechaIngreso)
    dias_extra = empleado.diasVacacionesExtra or 0
    dias_totales = dias_anuales + dias_extra
    vacaciones = [s for s in solicitudes if s.tipo == "VACACION"]
    permisos = [s for s in solicitudes if s.tipo == "PERMISO"]

    def dias_de(s):
        return s.diasSolicitados or calcular_dias_habiles(s.fechaInicio, s.fechaFin)

    dias_usados = sum(dias_de(s) for s in vacaciones if s.estado == "APROBADA")
    dias_pendientes = sum(
        dias_de(s) for s in vacaciones if s.estado == "PENDIENTE" and s.id != solicitud_actual_id
    )
    dias_disponibles = max(0, dias_totales - dias_usados - dias_pendientes)
    solicitud_actual = next((s for s in vacaciones if s.id == solicitud_actual_id), None) if solicitud_actual_id else None
    dias_solicitud_actual = dias_de(solicitud_actual) if solicitud_actual else None
    puede_autorizar = dias_disponibles >= (dias_solicitud_actual or 0) if dias_solicitud_actual else True

    dept = None
    org = None
    if empleado.departamento_id:
        from core.models import Departamento

        dept_obj = Departamento.objects.select_related("organizacion").filter(id=empleado.departamento_id).first()
        if dept_obj:
            dept = dept_obj.nombre
            if dept_obj.organizacion_id:
                org = dept_obj.organizacion.nombre

    return {
        "empleado": empleado,
        "dept": dept,
        "org": org,
        "antiguedad": calcular_antiguedad(empleado.fechaIngreso),
        "dias_anuales": dias_anuales,
        "dias_extra": dias_extra,
        "dias_totales": dias_totales,
        "dias_usados": dias_usados,
        "dias_pendientes": dias_pendientes,
        "dias_disponibles": dias_disponibles,
        "puede_autorizar": puede_autorizar,
        "historial_vacaciones": vacaciones,
        "historial_permisos": permisos,
        "resumen_anual": {
            "vacaciones_aprobadas": len([s for s in vacaciones if s.estado == "APROBADA"]),
            "permisos_aprobados": len([s for s in permisos if s.estado == "APROBADA"]),
            "solicitudes_pendientes": len([s for s in solicitudes if s.estado == "PENDIENTE"]),
        },
    }
