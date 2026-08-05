import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { construirExpedienteVacaciones } from "@/lib/vacaciones";

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

  if (session!.rol === "Empleado" && session!.empleadoId !== empleadoId) {
    return apiError("Solo puedes ver tu propio expediente de vacaciones", 403);
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

  return apiSuccess(expediente);
}
