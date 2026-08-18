ROLES_SIN_RESTRICCION = ["Administrador", "Recursos Humanos"]


def parse_minutos(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m or 0)


def minutos_actuales() -> int:
    from datetime import datetime

    now = datetime.now()
    return now.hour * 60 + now.minute


def en_ventana_turno(turno) -> bool:
    start = parse_minutos(turno.horaInicio)
    end = parse_minutos(turno.horaFin)
    now = minutos_actuales()
    if start <= end:
        return start <= now < end
    return now >= start or now < end


def mensaje_fuera_de_turno() -> str:
    return "El sistema no se encuentra disponible para su turno en este momento."


def rol_exento_horario_laboral(rol: str) -> bool:
    return rol in ROLES_SIN_RESTRICCION
