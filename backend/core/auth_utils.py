import json
from functools import wraps

import bcrypt
from django.http import HttpResponseForbidden, HttpResponseRedirect
from django.shortcuts import redirect
from django.urls import reverse

from core.models import Empleado, Rol, Usuario


def parse_permisos(json_str: str) -> list[str]:
    try:
        return json.loads(json_str or "[]")
    except json.JSONDecodeError:
        return []


def has_permission(permisos: list[str], required: str) -> bool:
    if "*" in permisos:
        return True
    if permisos and any(p.endswith(":*") for p in permisos):
        module = required.split(":")[0]
        if f"{module}:*" in permisos:
            return True
    return required in permisos


def verify_password(plain: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def load_session_user(request) -> dict | None:
    uid = request.session.get("humanlink_user_id")
    if not uid:
        return None
    try:
        usuario = Usuario.objects.select_related("rol").get(id=uid, activo=True)
    except Usuario.DoesNotExist:
        return None
    empleado_id = request.session.get("humanlink_empleado_id")
    permisos = parse_permisos(usuario.rol.permisos)
    return {
        "user_id": usuario.id,
        "email": usuario.email,
        "rol": usuario.rol.nombre,
        "permisos": permisos,
        "empleado_id": empleado_id,
        "usuario": usuario,
    }


def login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = load_session_user(request)
        if not user:
            return redirect(f"{reverse('login')}?next={request.path}")
        request.humanlink_user = user
        return view_func(request, *args, **kwargs)

    return wrapper


def permission_required(permission: str):
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            if not has_permission(request.humanlink_user["permisos"], permission):
                return HttpResponseForbidden("Sin permisos")
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def role_required(*roles: str):
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            if request.humanlink_user["rol"] not in roles:
                return HttpResponseForbidden("Sin permisos")
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def get_empleado_for_user(user: dict) -> Empleado | None:
    eid = user.get("empleado_id")
    if not eid:
        return None
    try:
        return Empleado.objects.select_related("departamento__organizacion", "turno").get(id=eid)
    except Empleado.DoesNotExist:
        return None
