import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notificarUsuarioId } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

// RF-H05 - Empleado se inscribe en capacitación
export async function POST(_req: Request, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  if (!session.empleadoId) {
    return apiError("Usuario sin empleado asociado", 400);
  }

  const capacitacionId = parseInt((await params).id);

  const cap = await prisma.capacitacion.findUnique({
    where: { id: capacitacionId },
    include: { _count: { select: { empleados: true } } },
  });

  if (!cap) return apiError("Capacitación no encontrada", 404);
  if (cap._count.empleados >= cap.cupoMaximo) {
    return apiError("No hay cupo disponible en esta capacitación", 409);
  }

  const yaInscrito = await prisma.capacitacionEmpleado.findUnique({
    where: {
      capacitacionId_empleadoId: {
        capacitacionId,
        empleadoId: session.empleadoId,
      },
    },
  });

  if (yaInscrito) return apiError("Ya estás inscrito en esta capacitación", 409);

  const inscripcion = await prisma.capacitacionEmpleado.create({
    data: {
      capacitacionId,
      empleadoId: session.empleadoId,
      estado: "INSCRITO",
    },
    include: { capacitacion: true },
  });

  await notificarUsuarioId(
    session.userId,
    "Inscripción confirmada",
    `Te inscribiste en: ${cap.nombre}`,
    "CAPACITACION"
  );

  return apiSuccess(inscripcion, 201);
}
