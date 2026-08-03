import type { Empleado, SolicitudPermiso } from "@prisma/client";

export type SolicitudConEstado = Pick<
  SolicitudPermiso,
  "id" | "tipo" | "fechaInicio" | "fechaFin" | "diasSolicitados" | "motivo" | "estado" | "respuesta" | "createdAt" | "fechaResolucion"
>;

/** Días hábiles entre dos fechas (inclusive) */
export function calcularDiasHabiles(inicio: Date, fin: Date): number {
  const start = new Date(inicio);
  start.setHours(0, 0, 0, 0);
  const end = new Date(fin);
  end.setHours(0, 0, 0, 0);
  if (end < start) return 0;

  let dias = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dias++;
    cur.setDate(cur.getDate() + 1);
  }
  return dias;
}

/** Antigüedad según LFT México (días de vacaciones anuales) */
export function calcularDiasVacacionesAnuales(fechaIngreso: Date): number {
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  let años = hoy.getFullYear() - ingreso.getFullYear();
  const cumpleAños =
    hoy.getMonth() > ingreso.getMonth() ||
    (hoy.getMonth() === ingreso.getMonth() && hoy.getDate() >= ingreso.getDate());
  if (!cumpleAños) años--;

  if (años < 1) return 12;
  if (años === 1) return 12;
  if (años === 2) return 14;
  if (años === 3) return 16;
  if (años === 4) return 18;
  if (años === 5) return 20;
  if (años >= 6 && años <= 10) return 22;
  if (años >= 11 && años <= 15) return 24;
  if (años >= 16 && años <= 20) return 26;
  if (años >= 21 && años <= 25) return 28;
  if (años >= 26 && años <= 30) return 30;
  return 32;
}

export function calcularAntiguedad(fechaIngreso: Date) {
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  let años = hoy.getFullYear() - ingreso.getFullYear();
  let meses = hoy.getMonth() - ingreso.getMonth();
  if (meses < 0) {
    años--;
    meses += 12;
  }
  if (hoy.getDate() < ingreso.getDate() && meses === 0) {
    años--;
    meses = 11;
  } else if (hoy.getDate() < ingreso.getDate()) {
    meses--;
  }
  return { años, meses };
}

export interface ExpedienteVacaciones {
  empleado: {
    id: number;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string | null;
    numeroEmpleado: string;
    puesto: string;
    fechaIngreso: string;
    fotoUrl?: string | null;
    departamento?: string | null;
    organizacion?: string | null;
  };
  antiguedad: { años: number; meses: number };
  diasAnuales: number;
  diasExtra: number;
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
  puedeAutorizarVacacion: (dias: number) => boolean;
  historialVacaciones: SolicitudConEstado[];
  historialPermisos: SolicitudConEstado[];
  resumenAnual: {
    vacacionesAprobadas: number;
    permisosAprobados: number;
    solicitudesPendientes: number;
  };
}

export function construirExpedienteVacaciones(
  empleado: Empleado & {
    departamento?: { nombre: string; organizacion?: { nombre: string } } | null;
  },
  solicitudes: SolicitudPermiso[],
  solicitudActualId?: number
): Omit<ExpedienteVacaciones, "puedeAutorizarVacacion"> & {
  puedeAutorizar: boolean;
  diasSolicitudActual?: number;
} {
  const diasAnuales = calcularDiasVacacionesAnuales(empleado.fechaIngreso);
  const diasExtra = empleado.diasVacacionesExtra ?? 0;
  const diasTotales = diasAnuales + diasExtra;

  const vacaciones = solicitudes.filter((s) => s.tipo === "VACACION");
  const permisos = solicitudes.filter((s) => s.tipo === "PERMISO");

  const diasUsados = vacaciones
    .filter((s) => s.estado === "APROBADA")
    .reduce((acc, s) => acc + (s.diasSolicitados || calcularDiasHabiles(s.fechaInicio, s.fechaFin)), 0);

  const diasPendientes = vacaciones
    .filter((s) => s.estado === "PENDIENTE" && s.id !== solicitudActualId)
    .reduce((acc, s) => acc + (s.diasSolicitados || calcularDiasHabiles(s.fechaInicio, s.fechaFin)), 0);

  const diasDisponibles = Math.max(0, diasTotales - diasUsados - diasPendientes);

  const solicitudActual = solicitudActualId
    ? vacaciones.find((s) => s.id === solicitudActualId)
    : undefined;
  const diasSolicitudActual = solicitudActual
    ? solicitudActual.diasSolicitados || calcularDiasHabiles(solicitudActual.fechaInicio, solicitudActual.fechaFin)
    : undefined;

  const mapSolicitud = (s: SolicitudPermiso): SolicitudConEstado => ({
    id: s.id,
    tipo: s.tipo,
    fechaInicio: s.fechaInicio,
    fechaFin: s.fechaFin,
    diasSolicitados: s.diasSolicitados,
    motivo: s.motivo,
    estado: s.estado,
    respuesta: s.respuesta,
    createdAt: s.createdAt,
    fechaResolucion: s.fechaResolucion,
  });

  return {
    empleado: {
      id: empleado.id,
      nombre: empleado.nombre,
      apellidoPaterno: empleado.apellidoPaterno,
      apellidoMaterno: empleado.apellidoMaterno,
      numeroEmpleado: empleado.numeroEmpleado,
      puesto: empleado.puesto,
      fechaIngreso: empleado.fechaIngreso.toISOString(),
      fotoUrl: empleado.fotoUrl,
      departamento: empleado.departamento?.nombre ?? null,
      organizacion: empleado.departamento?.organizacion?.nombre ?? null,
    },
    antiguedad: calcularAntiguedad(empleado.fechaIngreso),
    diasAnuales,
    diasExtra,
    diasTotales,
    diasUsados,
    diasPendientes,
    diasDisponibles,
    puedeAutorizar: diasSolicitudActual != null ? diasDisponibles >= diasSolicitudActual : true,
    diasSolicitudActual,
    historialVacaciones: vacaciones.map(mapSolicitud),
    historialPermisos: permisos.map(mapSolicitud),
    resumenAnual: {
      vacacionesAprobadas: vacaciones.filter((s) => s.estado === "APROBADA").length,
      permisosAprobados: permisos.filter((s) => s.estado === "APROBADA").length,
      solicitudesPendientes: solicitudes.filter((s) => s.estado === "PENDIENTE").length,
    },
  };
}

export function haySolapamiento(
  solicitudes: Pick<SolicitudPermiso, "id" | "fechaInicio" | "fechaFin" | "estado">[],
  inicio: Date,
  fin: Date,
  excluirId?: number
): boolean {
  return solicitudes.some((s) => {
    if (s.estado === "RECHAZADA") return false;
    if (excluirId && s.id === excluirId) return false;
    const sInicio = new Date(s.fechaInicio);
    const sFin = new Date(s.fechaFin);
    return inicio <= sFin && fin >= sInicio;
  });
}
