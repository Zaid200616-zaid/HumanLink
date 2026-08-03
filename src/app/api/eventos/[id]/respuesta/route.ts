import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const respuestaSchema = z.object({
  respuesta: z.enum(["CONFIRMADO", "RECHAZADO", "PENDIENTE"]),
});

// Empleado confirma, rechaza o se inscribe en evento
export async function POST(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  if (!session.empleadoId) {
    return apiError("Usuario sin empleado asociado", 400);
  }

  const eventoId = parseInt((await params).id);
  const body = await request.json();
  const parsed = respuestaSchema.safeParse(body);
  if (!parsed.success) return apiError("Respuesta inválida");

  const evento = await prisma.eventoOrganizacional.findUnique({
    where: { id: eventoId },
    include: { respuestas: true },
  });

  if (!evento) return apiError("Evento no encontrado", 404);

  const existente = evento.respuestas.find((r) => r.empleadoId === session.empleadoId);

  if (!existente && !evento.inscripcionAbierta) {
    return apiError("Este evento no permite inscripción abierta", 403);
  }

  const respuesta = await prisma.eventoRespuesta.upsert({
    where: {
      eventoId_empleadoId: {
        eventoId,
        empleadoId: session.empleadoId,
      },
    },
    update: { respuesta: parsed.data.respuesta },
    create: {
      eventoId,
      empleadoId: session.empleadoId,
      respuesta: parsed.data.respuesta,
    },
  });

  return apiSuccess(respuesta);
}
