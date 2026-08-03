/** RNF-A02 — Acceso por horario del turno asignado al empleado. */
const ROLES_SIN_RESTRICCION = ["Administrador", "Recursos Humanos"];

type TurnoHorario = { horaInicio: string; horaFin: string; nombre?: string };

function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutosActuales(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function enVentanaTurno(turno: TurnoHorario): boolean {
  const start = parseMinutos(turno.horaInicio);
  const end = parseMinutos(turno.horaFin);
  const now = minutosActuales();

  if (start <= end) {
    return now >= start && now < end;
  }
  return now >= start || now < end;
}

export function mensajeFueraDeTurno(): string {
  return "El sistema no se encuentra disponible para su turno en este momento.";
}

export function rolExentoHorarioLaboral(rol: string): boolean {
  return ROLES_SIN_RESTRICCION.includes(rol);
}
