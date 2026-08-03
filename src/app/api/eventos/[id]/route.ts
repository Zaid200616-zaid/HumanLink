import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth("eventos:write");
  if (error || !session) return error;
  if (session.rol !== "Administrador") {
    return apiError("Solo el Administrador puede dar de baja eventos", 403);
  }

  const id = parseInt((await params).id);
  const evento = await prisma.eventoOrganizacional.update({
    where: { id },
    data: { activo: false },
  });

  return apiSuccess(evento);
}
