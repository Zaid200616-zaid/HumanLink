import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const pref = await prisma.preferenciaUsuario.findUnique({ where: { usuarioId: session!.userId } });
  return apiSuccess(pref || { tema: "dark", idioma: "es" });
}

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const body = await request.json();
  const pref = await prisma.preferenciaUsuario.upsert({
    where: { usuarioId: session!.userId },
    create: {
      usuarioId: session!.userId,
      tema: body.tema || "dark",
      idioma: body.idioma || "es",
    },
    update: {
      ...(body.tema && { tema: body.tema }),
      ...(body.idioma && { idioma: body.idioma }),
    },
  });
  return apiSuccess(pref);
}
