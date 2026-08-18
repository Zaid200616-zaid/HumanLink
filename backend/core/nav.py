from django.utils import timezone

from core.models import Empleado, Rol, Usuario


NAV_ITEMS = [
    {"href": "/dashboard/", "label": "Inicio", "group": "General", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/perfil/", "label": "Mi Perfil", "group": "General", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/buscar/", "label": "Búsqueda", "group": "General", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/notificaciones/", "label": "Notificaciones", "group": "General", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/empleados/", "label": "Empleados", "group": "Personal", "roles": ["Administrador", "Recursos Humanos", "Supervisor"]},
    {"href": "/documentos/", "label": "Documentos", "group": "Personal", "roles": ["Administrador", "Recursos Humanos"]},
    {"href": "/departamentos/", "label": "Departamentos", "group": "Organización", "roles": ["Administrador", "Recursos Humanos", "Supervisor"]},
    {"href": "/registro-entrada/", "label": "Registrar Entrada", "group": "Personal", "roles": ["Empleado"]},
    {"href": "/asistencias/", "label": "Asistencias", "group": "Personal", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/turnos/", "label": "Turnos Laborales", "group": "Personal", "roles": ["Administrador", "Recursos Humanos"]},
    {"href": "/solicitudes/", "label": "Permisos y Vacaciones", "group": "Personal", "roles": ["Administrador", "Recursos Humanos", "Empleado", "Supervisor"]},
    {"href": "/vacaciones/", "label": "Expediente Vacaciones", "group": "Personal", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/vacantes/", "label": "Vacantes", "group": "Reclutamiento", "roles": ["Administrador", "Recursos Humanos"]},
    {"href": "/candidatos/", "label": "Contrataciones", "group": "Reclutamiento", "roles": ["Administrador", "Recursos Humanos"]},
    {"href": "/capacitaciones/", "label": "Capacitaciones", "group": "Desarrollo", "roles": ["Administrador", "Recursos Humanos", "Empleado"]},
    {"href": "/evaluaciones/", "label": "Evaluaciones", "group": "Desarrollo", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/eventos/", "label": "Eventos Organizacionales", "group": "Desarrollo", "roles": ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"]},
    {"href": "/quejas/", "label": "Quejas Laborales", "group": "Comunicación", "roles": ["Administrador", "Recursos Humanos", "Empleado"]},
    {"href": "/reportes/", "label": "Reportes", "group": "Administración", "roles": ["Administrador", "Recursos Humanos", "Supervisor"]},
    {"href": "/reportes/historial/", "label": "Historial de reportes", "group": "Administración", "roles": ["Administrador", "Recursos Humanos"]},
    {"href": "/permisos-rol/", "label": "Asignación de roles", "group": "Administración", "roles": ["Administrador"]},
    {"href": "/database-demo/", "label": "Demostración BD", "group": "Administración", "roles": ["Administrador", "Recursos Humanos"]},
]

DEMO_USERS = [
    {"label": "Administrador", "email": "admin@humanlink.mx", "rol": "Administrador"},
    {"label": "Recursos Humanos", "email": "ernesto.gutierrez@humanlink.mx", "rol": "Recursos Humanos"},
    {"label": "Supervisor", "email": "carlos.ramirez@humanlink.mx", "rol": "Supervisor"},
    {"label": "Empleado", "email": "ramses.dejesus@humanlink.mx", "rol": "Empleado"},
    {"label": "Empleada", "email": "carol.olaiz@humanlink.mx", "rol": "Empleado"},
]


def get_nav_for_role(rol: str) -> dict[str, list]:
    items = [i for i in NAV_ITEMS if rol in i["roles"]]
    grouped: dict[str, list] = {}
    for item in items:
        grouped.setdefault(item["group"], []).append(item)
    return grouped
