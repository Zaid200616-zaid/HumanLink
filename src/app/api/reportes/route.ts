import { NextRequest } from "next/server";
import { apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function rangoMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1);
  const fin = new Date(y, m, 0, 23, 59, 59, 999);
  return { inicio, fin };
}

// RF-H08 - Reportes administrativos (por mes)
export async function GET(request: NextRequest) {
  const { error } = await requireAuth("reportes:read");
  if (error) return error;

  const mesParam = request.nextUrl.searchParams.get("mes");
  const mes =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : new Date().toISOString().slice(0, 7);
  const { inicio, fin } = rangoMes(mes);

  const [
    totalEmpleados,
    empleadosActivos,
    totalVacantes,
    vacantesAbiertas,
    totalCandidatos,
    candidatosPorEtapa,
    totalCapacitaciones,
    asistenciasMes,
    solicitudesPendientes,
    totalOrganizaciones,
    totalDepartamentos,
    quejasAbiertas,
    vacacionesAprobadasMes,
    evaluacionesMes,
  ] = await Promise.all([
    prisma.empleado.count(),
    prisma.empleado.count({ where: { activo: true } }),
    prisma.vacante.count(),
    prisma.vacante.count({ where: { estado: "ABIERTA" } }),
    prisma.candidato.count({
      where: { createdAt: { gte: inicio, lte: fin } },
    }),
    prisma.candidato.groupBy({ by: ["etapa"], _count: true }),
    prisma.capacitacion.count({
      where: { fechaInicio: { gte: inicio, lte: fin } },
    }),
    prisma.asistencia.count({ where: { fecha: { gte: inicio, lte: fin } } }),
    prisma.solicitudPermiso.count({ where: { estado: "PENDIENTE" } }),
    prisma.organizacion.count({ where: { activa: true } }),
    prisma.departamento.count(),
    prisma.quejaLaboral.count({
      where: { estado: { in: ["REGISTRADA", "EN_REVISION"] } },
    }),
    prisma.solicitudPermiso.count({
      where: {
        tipo: "VACACION",
        estado: "APROBADA",
        fechaResolucion: { gte: inicio, lte: fin },
      },
    }),
    prisma.evaluacionDesempeno.count({
      where: { fecha: { gte: inicio, lte: fin } },
    }),
  ]);

  const empleadosPorDepto = await prisma.departamento.findMany({
    include: { _count: { select: { empleados: true } }, organizacion: true },
  });

  const asistenciaPorEstado = await prisma.asistencia.groupBy({
    by: ["estado"],
    _count: true,
    where: { fecha: { gte: inicio, lte: fin } },
  });

  return apiSuccess({
    mes,
    resumen: {
      totalEmpleados,
      empleadosActivos,
      totalVacantes,
      vacantesAbiertas,
      totalCandidatos,
      totalCapacitaciones,
      asistenciasMes,
      solicitudesPendientes,
      totalOrganizaciones,
      totalDepartamentos,
      quejasAbiertas,
      vacacionesAprobadasMes,
      evaluacionesMes,
    },
    candidatosPorEtapa,
    empleadosPorDepto: empleadosPorDepto.map((d) => ({
      departamento: d.nombre,
      organizacion: d.organizacion.nombre,
      empleados: d._count.empleados,
    })),
    asistenciaPorEstado,
  });
}
