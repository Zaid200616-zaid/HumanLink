from django.utils import timezone

from core.models import EmailLog, Notificacion


def notificar_usuario_id(usuario_id: int, titulo: str, mensaje: str, tipo: str = "GENERAL"):
    Notificacion.objects.create(
        usuarioId=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        leida=False,
        createdAt=timezone.now(),
    )


def log_email(destino: str, asunto: str, cuerpo: str):
    EmailLog.objects.create(
        destino=destino,
        asunto=asunto,
        cuerpo=cuerpo,
        enviado=False,
        createdAt=timezone.now(),
    )
