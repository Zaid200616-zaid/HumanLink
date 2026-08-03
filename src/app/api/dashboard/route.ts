import { apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const hoy = new Date(new Date().toISOString().split("T")[0]);

  if (session!.rol === "Empleado" && session!.empleadoId) {
    const empleadoId = session!.empleadoId;
    const [solicitudesPendientes, asistenciasHoy, notificacionesNoLeidas, proximoEvento] =
      await Promise.all([
        prisma.solicitudPermiso.count({ where: { empleadoId, estado: "PENDIENTE" } }),
        prisma.asistencia.count({ where: { empleadoId, fecha: hoy } }),
        prisma.notificacion.count({ where: { usuarioId: session!.userId, leida: false } }),
        prisma.eventoOrganizacional.findFirst({
          where: { fecha: { gte: hoy } },
          orderBy: { fecha: "asc" },
        }),
      ]);

    return apiSuccess({
      rol: "Empleado",
      resumen: {
        solicitudesPendientes,
        asistenciasHoy,
        notificacionesNoLeidas,
        proximoEvento: proximoEvento?.titulo ?? null,
      },
    });
  }

  if (session!.rol === "Supervisor" && session!.empleadoId) {
    const depts = await prisma.departamento.findMany({
      where: { supervisorId: session!.empleadoId },
      select: { id: true },
    });
    const deptIds = depts.map((d) => d.id);

    const [equipoPendientes, asistenciasHoy, evaluacionesPendientes, tamanoEquipo] =
      await Promise.all([
        prisma.solicitudPermiso.count({
          where: {
            empleado: { departamentoId: { in: deptIds } },
            aprobacionSupervisor: "PENDIENTE",
            estado: "PENDIENTE",
          },
        }),
        prisma.asistencia.count({
          where: { empleado: { departamentoId: { in: deptIds } }, fecha: hoy },
        }),
        prisma.evaluacionDesempeno.count({ where: { evaluadorId: session!.empleadoId } }),
        prisma.empleado.count({
          where: { departamentoId: { in: deptIds }, activo: true },
        }),
      ]);

    return apiSuccess({
      rol: "Supervisor",
      resumen: {
        equipoPendientes,
        asistenciasHoy,
        evaluacionesPendientes,
        tamanoEquipo,
      },
    });
  }

  const [
    empleadosActivos,
    solicitudesPendientes,
    quejasAbiertas,
    vacantesAbiertas,
    asistenciasHoy,
    notificacionesNoLeidas,
  ] = await Promise.all([
    prisma.empleado.count({ where: { activo: true } }),
    prisma.solicitudPermiso.count({ where: { estado: "PENDIENTE" } }),
    prisma.quejaLaboral.count({ where: { estado: { in: ["REGISTRADA", "EN_REVISION"] } } }),
    prisma.vacante.count({ where: { estado: "ABIERTA" } }),
    prisma.asistencia.count({ where: { fecha: hoy } }),
    prisma.notificacion.count({ where: { usuarioId: session!.userId, leida: false } }),
  ]);

  return apiSuccess({
    rol: session!.rol,
    resumen: {
      empleadosActivos,
      solicitudesPendientes,
      quejasAbiertas,
      vacantesAbiertas,
      asistenciasHoy,
      notificacionesNoLeidas,
    },
  });
}
