import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { construirExpedienteVacaciones } from "@/lib/vacaciones";
import { consultarSaldoVacacionesSp } from "@/lib/mysql-vacaciones";
import { resolveEmpleadoId } from "@/lib/session-empleado";

type Params = { params: Promise<{ empleadoId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const empleadoId = parseInt((await params).empleadoId);
  const solicitudId = request.nextUrl.searchParams.get("solicitudId");

  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: { departamento: { include: { organizacion: true } } },
  });

  if (!empleado) return apiError("Empleado no encontrado", 404);

  if (session!.rol === "Empleado") {
    const empleadoSesion = await resolveEmpleadoId(session!);
    if (!empleadoSesion || empleadoSesion !== empleadoId) {
      return apiError("Solo puedes ver tu propio expediente de vacaciones", 403);
    }
  }

  if (session!.rol === "Supervisor" && session!.empleadoId) {
    const depts = await prisma.departamento.findMany({
      where: { supervisorId: session!.empleadoId },
      select: { id: true },
    });
    const deptIds = depts.map((d) => d.id);
    if (!empleado.departamentoId || !deptIds.includes(empleado.departamentoId)) {
      return apiError("No supervisas a este empleado", 403);
    }
  }

  const solicitudes = await prisma.solicitudPermiso.findMany({
    where: { empleadoId },
    orderBy: { createdAt: "desc" },
  });

  const expediente = construirExpedienteVacaciones(
    empleado,
    solicitudes,
    solicitudId ? parseInt(solicitudId) : undefined
  );

  // Saldo autoritativo desde MySQL (misma lógica que trg_solicitud_validar_saldo_vacaciones).
  try {
    const saldoSp = await consultarSaldoVacacionesSp(empleadoId);
    if (saldoSp && solicitudId && expediente.diasSolicitudActual != null) {
      return apiSuccess({
        ...expediente,
        diasDisponibles: saldoSp.saldoDisponible + expediente.diasSolicitudActual,
        puedeAutorizar: expediente.puedeAutorizar,
      });
    }
    if (saldoSp && saldoSp.empleadoId === empleadoId) {
      return apiSuccess({
        ...expediente,
        diasDisponibles: saldoSp.saldoDisponible,
      });
    }
  } catch {
    // Si el SP no está instalado, se conserva el expediente calculado en aplicación.
  }

  return apiSuccess(expediente);
}
