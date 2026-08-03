import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notificarUsuarioId } from "@/lib/email";

// RF-H17 | RNF11
export async function GET() {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const eventos = await prisma.eventoOrganizacional.findMany({
    where: { activo: true },
    include: {
      respuestas: { include: { empleado: true } },
    },
    orderBy: { fecha: "desc" },
  });

  const result = eventos.map((e) => {
    const totalConvocados = e.respuestas.length;
    const confirmados = e.respuestas.filter((r) => r.respuesta === "CONFIRMADO").length;
    const rechazados = e.respuestas.filter((r) => r.respuesta === "RECHAZADO").length;
    const pendientes = e.respuestas.filter((r) => r.respuesta === "PENDIENTE").length;

    const miRespuesta = session.empleadoId
      ? e.respuestas.find((r) => r.empleadoId === session.empleadoId)
      : undefined;

    return {
      id: e.id,
      titulo: e.titulo,
      descripcion: e.descripcion,
      fecha: e.fecha,
      ubicacion: e.ubicacion,
      inscripcionAbierta: e.inscripcionAbierta,
      resumen: { totalConvocados, confirmados, rechazados, pendientes },
      miRespuesta: miRespuesta
        ? { id: miRespuesta.id, respuesta: miRespuesta.respuesta }
        : null,
    };
  });

  return apiSuccess(result);
}

const eventoSchema = z.object({
  titulo: z.string().min(3),
  descripcion: z.string().optional(),
  fecha: z.string(),
  ubicacion: z.string().optional(),
  inscripcionAbierta: z.boolean().optional(),
  empleadoIds: z.array(z.number()).optional(),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("eventos:write");
  if (error) return error;

  const body = await request.json();
  const parsed = eventoSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const { empleadoIds, ...data } = parsed.data;

  const evento = await prisma.eventoOrganizacional.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion,
      ubicacion: data.ubicacion,
      inscripcionAbierta: data.inscripcionAbierta ?? true,
      fecha: new Date(data.fecha),
      respuestas: empleadoIds?.length
        ? { create: empleadoIds.map((empleadoId) => ({ empleadoId })) }
        : undefined,
    },
    include: { respuestas: true },
  });

  // Notificar empleados convocados
  if (empleadoIds?.length) {
    const usuarios = await prisma.usuario.findMany({
      where: { empleado: { id: { in: empleadoIds } } },
    });
    for (const u of usuarios) {
      await notificarUsuarioId(u.id, "Nuevo evento organizacional", `Has sido convocado a: ${data.titulo}`, "EVENTO");
    }
  }

  return apiSuccess(evento, 201);
}
