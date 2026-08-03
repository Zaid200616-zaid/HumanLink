import { NextRequest } from "next/server";

import { apiError, apiSuccess, requireAuth } from "@/lib/api";

import { prisma } from "@/lib/prisma";

import { notificarUsuarioId } from "@/lib/email";

import { quejaCreateSchema, quejaPatchSchema } from "@/lib/schemas/queja";
import { MSG_BLOQUEO_QUEJA_CERRADA, quejaEstaCerrada } from "@/lib/quejas-bloqueo";
import { firstZodError } from "@/lib/validation/zod-errors";



// RF-H16 · RNF-PQ01 — más antigua primero (asc por fecha de registro)

export async function GET() {

  const { error, session } = await requireAuth();

  if (error) return error;



  const quejas = await prisma.quejaLaboral.findMany({

    where:

      session!.rol === "Empleado" && session!.empleadoId

        ? { empleadoId: session!.empleadoId }

        : undefined,

    include: { empleado: true },

    orderBy: { createdAt: "asc" },

  });



  return apiSuccess(quejas);

}



export async function POST(request: NextRequest) {

  const { error, session } = await requireAuth();

  if (error) return error;



  if (!session!.empleadoId) return apiError("Sin empleado asociado");



  const body = await request.json();

  const parsed = quejaCreateSchema.safeParse(body);

  if (!parsed.success) {

    return apiError(firstZodError(parsed.error), 400);

  }



  const queja = await prisma.quejaLaboral.create({

    data: { empleadoId: session!.empleadoId, ...parsed.data },

    include: { empleado: true },

  });



  const admins = await prisma.usuario.findMany({

    where: { rol: { nombre: "Administrador" }, activo: true },

  });

  for (const u of admins) {

    await notificarUsuarioId(

      u.id,

      "Nueva queja laboral",

      `${queja.empleado.nombre} ${queja.empleado.apellidoPaterno}: ${queja.asunto}`,

      "QUEJA"

    );

  }



  return apiSuccess(queja, 201);

}



export async function PATCH(request: NextRequest) {

  const { error, session } = await requireAuth("quejas:*");

  if (error || !session) return error;



  const body = await request.json();

  const parsed = quejaPatchSchema.safeParse({

    id: typeof body.id === "string" ? parseInt(body.id, 10) : body.id,

    estado: body.estado,

    seguimiento: body.seguimiento ?? null,

  });

  if (!parsed.success) {

    return apiError(firstZodError(parsed.error), 400);

  }



  const { id, estado, seguimiento } = parsed.data;



  const prev = await prisma.quejaLaboral.findUnique({ where: { id } });

  if (!prev) return apiError("Queja no encontrada", 404);



  if (quejaEstaCerrada(prev.estado)) {
    return apiError(MSG_BLOQUEO_QUEJA_CERRADA, 403);
  }

  const queja = await prisma.$transaction(async (tx) => {

    const updated = await tx.quejaLaboral.update({

      where: { id },

      data: { estado, seguimiento: seguimiento ?? prev.seguimiento },

      include: { empleado: true },

    });



    if (estado !== prev.estado) {

      await tx.quejaHistorial.create({

        data: {

          quejaId: id,

          usuarioId: session.userId,

          estadoAnterior: prev.estado,

          estadoNuevo: estado,

        },

      });

    }



    return updated;

  });



  return apiSuccess(queja);

}


