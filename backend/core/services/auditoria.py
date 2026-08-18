from django.utils import timezone

from core.models import AuditoriaLog


def registrar_auditoria(usuario_id, email, accion, modulo, detalle=""):
    AuditoriaLog.objects.create(
        usuarioId=usuario_id,
        email=email,
        accion=accion,
        modulo=modulo,
        detalle=detalle,
        createdAt=timezone.now(),
    )
