/** Lógica compartida: registro de entrada y estados de asistencia. */

export const MINUTOS_ANTES_REGISTRO = 30;
export const MINUTOS_DESPUES_INICIO_PARA_FALTA = 30;

export function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutosActuales(fecha = new Date()): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

export function horaActualHHMM(fecha = new Date()): string {
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

export function minutosAHhmm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function calcularEstadoEntrada(
  horaInicioTurno: string,
  horaEntrada: string
): "PUNTUAL" | "RETARDO" {
  const start = parseMinutos(horaInicioTurno);
  const entrada = parseMinutos(horaEntrada);
  return entrada <= start ? "PUNTUAL" : "RETARDO";
}

export function validarVentanaRegistro(turno: {
  horaInicio: string;
  horaFin: string;
}): { ok: true } | { ok: false; message: string } {
  const now = minutosActuales();
  const start = parseMinutos(turno.horaInicio);
  const earliest = start - MINUTOS_ANTES_REGISTRO;

  if (now < earliest) {
    return {
      ok: false,
      message: `El registro de entrada estará disponible a partir de las ${minutosAHhmm(earliest)}.`,
    };
  }

  const end = parseMinutos(turno.horaFin);
  if (start <= end && now > end) {
    return {
      ok: false,
      message: "El horario de tu turno para hoy ya finalizó. Contacta a Recursos Humanos si necesitas apoyo.",
    };
  }

  return { ok: true };
}

export function inicioDelDia(fecha = new Date()): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function rangoPeriodo(periodo: "dia" | "semana" | "mes", ref = new Date()): {
  desde: Date;
  hasta: Date;
} {
  const hasta = inicioDelDia(ref);
  hasta.setHours(23, 59, 59, 999);
  const desde = inicioDelDia(ref);

  if (periodo === "dia") {
    return { desde: inicioDelDia(ref), hasta };
  }

  if (periodo === "semana") {
    const d = inicioDelDia(ref);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return { desde: d, hasta };
  }

  desde.setDate(1);
  return { desde, hasta };
}

export function debeMarcarFaltaAutomatica(
  horaInicioTurno: string,
  fecha: Date,
  ahora = new Date()
): boolean {
  if (inicioDelDia(fecha).getTime() !== inicioDelDia(ahora).getTime()) {
    return inicioDelDia(fecha) < inicioDelDia(ahora);
  }
  const limite = parseMinutos(horaInicioTurno) + MINUTOS_DESPUES_INICIO_PARA_FALTA;
  return minutosActuales(ahora) >= limite;
}

export const ASISTENCIA_BADGES: Record<string, { className: string; label: string }> = {
  PUNTUAL: { className: "hl-badge hl-badge-success", label: "Puntual" },
  RETARDO: { className: "hl-badge hl-badge-warning", label: "Retardo" },
  FALTA: { className: "hl-badge hl-badge-danger", label: "Falta" },
  PERMISO: { className: "hl-badge hl-badge-primary", label: "Permiso" },
  VACACION: { className: "hl-badge hl-badge-neutral", label: "Vacación" },
};
