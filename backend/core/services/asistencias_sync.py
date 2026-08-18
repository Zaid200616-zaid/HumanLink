from datetime import timedelta

from django.utils import timezone

from core.models import Asistencia


def _each_day(start, end):
    cur = timezone.localtime(start).replace(hour=0, minute=0, second=0, microsecond=0)
    fin = timezone.localtime(end).replace(hour=0, minute=0, second=0, microsecond=0)
    days = []
    while cur <= fin:
        days.append(cur)
        cur = cur + timedelta(days=1)
    return days


def sincronizar_asistencias_solicitud(empleado_id: int, fecha_inicio, fecha_fin, tipo: str):
    estado = "VACACION" if tipo == "VACACION" else "PERMISO"
    now = timezone.now()
    for fecha in _each_day(fecha_inicio, fecha_fin):
        if fecha.weekday() >= 5:
            continue
        existing = Asistencia.objects.filter(empleado_id=empleado_id, fecha=fecha).first()
        if existing:
            Asistencia.objects.filter(id=existing.id).update(
                estado=estado,
                notas=f"Actualizado por solicitud {tipo}",
                updatedAt=now,
            )
        else:
            Asistencia.objects.create(
                empleado_id=empleado_id,
                fecha=fecha,
                estado=estado,
                notas=f"Generado por solicitud {tipo}",
                createdAt=now,
                updatedAt=now,
            )
