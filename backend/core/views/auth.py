import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib import messages
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone

from core.auth_utils import load_session_user, verify_password
from core.models import Empleado, SesionUsuario, Usuario
from core.nav import DEMO_USERS
from core.services.acceso_turno import (
    en_ventana_turno,
    mensaje_fuera_de_turno,
    rol_exento_horario_laboral,
)

MAX_INTENTOS = 5
MINUTOS_BLOQUEO = 15


def landing(request):
    if load_session_user(request):
        return redirect("dashboard")
    return render(request, "core/landing.html")


def login_view(request):
    if load_session_user(request):
        return redirect("dashboard")

    bloqueo = None
    next_url = request.GET.get("next") or reverse("dashboard")

    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        password = request.POST.get("password") or ""

        if not email:
            messages.error(request, "El campo Correo es obligatorio.")
        elif "@" not in email:
            messages.error(request, "El correo electrónico no es válido.")
        elif not password:
            messages.error(request, "El campo Contraseña es obligatorio.")
        else:
            try:
                usuario = Usuario.objects.select_related("rol").get(email=email)
            except Usuario.DoesNotExist:
                usuario = None

            if not usuario or not usuario.activo:
                messages.error(request, "Credenciales inválidas")
            elif usuario.bloqueadoHasta and usuario.bloqueadoHasta > timezone.now():
                restante = usuario.bloqueadoHasta - timezone.now()
                minutos = max(1, int(restante.total_seconds() // 60) + (1 if restante.seconds else 0))
                bloqueo = {
                    "motivo": "Múltiples intentos fallidos de inicio de sesión",
                    "minutosRestantes": minutos,
                    "mensaje": (
                        f"Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. "
                        f"Intenta nuevamente en {minutos} minuto(s) o contacta al administrador."
                    ),
                    "recomendaciones": [
                        "Verifica que tu contraseña sea correcta",
                        "Usa la opción «¿Olvidaste tu contraseña?» si la necesitas",
                        "Contacta al administrador si el problema continúa",
                    ],
                }
            elif not verify_password(password, usuario.passwordHash):
                intentos = usuario.intentosFallidos + 1
                data = {"intentosFallidos": intentos}
                if intentos >= MAX_INTENTOS:
                    data["bloqueadoHasta"] = timezone.now() + timedelta(minutes=MINUTOS_BLOQUEO)
                Usuario.objects.filter(id=usuario.id).update(**data)
                if intentos >= MAX_INTENTOS:
                    bloqueo = {
                        "motivo": "Múltiples intentos fallidos de inicio de sesión",
                        "minutosRestantes": MINUTOS_BLOQUEO,
                        "mensaje": (
                            f"Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. "
                            f"Intenta nuevamente en {MINUTOS_BLOQUEO} minutos o contacta al administrador."
                        ),
                        "recomendaciones": [
                            "Espera el tiempo indicado antes de volver a intentar",
                            "Contacta al administrador para desbloqueo anticipado",
                        ],
                    }
                else:
                    messages.error(request, "Credenciales inválidas")
            else:
                empleado = (
                    Empleado.objects.select_related("turno")
                    .filter(usuario_id=usuario.id, activo=True)
                    .first()
                )
                if (
                    not rol_exento_horario_laboral(usuario.rol.nombre)
                    and empleado
                    and empleado.turno
                    and not en_ventana_turno(empleado.turno)
                ):
                    messages.error(request, mensaje_fuera_de_turno())
                else:
                    request.session["humanlink_user_id"] = usuario.id
                    if empleado:
                        request.session["humanlink_empleado_id"] = empleado.id
                    else:
                        request.session.pop("humanlink_empleado_id", None)
                    request.session.modified = True

                    token = secrets.token_urlsafe(32)
                    token_hash = hashlib.sha256(token.encode()).hexdigest()
                    SesionUsuario.objects.create(
                        usuario_id=usuario.id,
                        tokenHash=token_hash,
                        ip=request.META.get("REMOTE_ADDR", "local"),
                        userAgent=(request.META.get("HTTP_USER_AGENT") or "unknown")[:500],
                        activa=True,
                        createdAt=timezone.now(),
                        expiresAt=timezone.now() + timedelta(hours=8),
                    )
                    Usuario.objects.filter(id=usuario.id).update(
                        intentosFallidos=0, bloqueadoHasta=None
                    )
                    return redirect(next_url)

    return render(
        request,
        "core/login.html",
        {
            "demo_users": DEMO_USERS,
            "demo_password": settings.HUMANLINK_DEMO_PASSWORD,
            "bloqueo": bloqueo,
            "next": next_url,
        },
    )


def logout_view(request):
    request.session.flush()
    messages.success(request, "Sesión cerrada correctamente.")
    return redirect("login")


def recuperar_view(request):
    return render(request, "core/recuperar.html")
