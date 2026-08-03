import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  debeMarcarFaltaAutomatica,
  inicioDelDia,
  minutosActuales,
  parseMinutos,
} from "@/lib/asistencia-registro";

async function sincronizarFaltasDelDia(fecha: Date) {
  const empleados = await prisma.empleado.findMany({
    where: { activo: true, turnoId: { not: null } },
    include: { turno: true },
  });

  for (const emp of empleados) {
    if (!emp.turno) continue;
    if (!debeMarcarFaltaAutomatica(emp.turno.horaInicio, fecha)) continue;

    const existente = await prisma.asistencia.findUnique({
      where: {
        empleadoId_fecha: { empleadoId: emp.id, fecha: inicioDelDia(fecha) },
      },
    });

    if (!existente) {
      await prisma.asistencia.create({
        data: {
          empleadoId: emp.id,
          fecha: inicioDelDia(fecha),
          estado: "FALTA",
          turnoNombre: emp.turno.nombre,
          notas: "Falta registrada automáticamente por ausencia de checada",
        },
      });
    }
  }
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth("asistencias:read");
  if (error || !session) return error;

  const esGestor =
    session.rol === "Administrador" ||
    session.rol === "Recursos Humanos" ||
    session.rol === "Supervisor";

  if (!esGestor) {
    return apiError("Sin permisos para estadísticas globales", 403);
  }

  const fechaParam = request.nextUrl.searchParams.get("fecha");
  const fecha = fechaParam ? inicioDelDia(new Date(fechaParam)) : inicioDelDia();

  await sincronizarFaltasDelDia(fecha);

  const registros = await prisma.asistencia.findMany({
    where: { fecha },
    include: { empleado: { include: { turno: true } } },
  });

  const puntuales = registros.filter((r) => r.estado === "PUNTUAL").length;
  const retardos = registros.filter((r) => r.estado === "RETARDO").length;
  const faltas = registros.filter((r) => r.estado === "FALTA").length;

  const empleadosActivos = await prisma.empleado.count({
    where: { activo: true, turnoId: { not: null } },
  });

  const empleadosConRegistro = new Set(registros.map((r) => r.empleadoId));
  const pendientesRegistro = Math.max(0, empleadosActivos - empleadosConRegistro.size);

  const empleadosTurno = await prisma.empleado.findMany({
    where: { activo: true, turnoId: { not: null } },
    include: { turno: true },
  });

  let pendientes = 0;
  const now = minutosActuales();
  for (const e of empleadosTurno) {
    if (!e.turno) continue;
    if (empleadosConRegistro.has(e.id)) continue;
    const limite = parseMinutos(e.turno.horaInicio) + 30;
    if (fecha.getTime() === inicioDelDia().getTime() && now < limite) {
      pendientes++;
    }
  }

  const totalEvaluable = puntuales + retardos + faltas + pendientes;
  const porcentajeAsistencia =
    totalEvaluable > 0
      ? Math.round(((puntuales + retardos) / totalEvaluable) * 100)
      : 100;

  return apiSuccess({
    fecha: fecha.toISOString(),
    puntuales,
    retardos,
    faltas,
    pendientes,
    pendientesRegistro,
    porcentajeAsistencia,
    totalRegistros: registros.length,
    empleadosActivos,
  });
}
