from core.auth_utils import load_session_user
from core.nav import get_nav_for_role


def humanlink_nav(request):
    user = request.humanlink_user or load_session_user(request)
    nav_groups = {}
    rol = ""
    if user:
        rol = user.get("rol", "")
        nav_groups = get_nav_for_role(rol)
    return {
        "hl_user": user,
        "hl_nav_groups": nav_groups,
        "hl_rol": rol,
    }
