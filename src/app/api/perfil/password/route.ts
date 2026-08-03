import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { passwordActual, passwordNueva } = body;
  if (!passwordActual || !passwordNueva || passwordNueva.length < 8) {
    return apiError("Contraseña actual y nueva (min 8) requeridas");
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: session!.userId } });
  if (!usuario) return apiError("Usuario no encontrado", 404);

  const valid = await verifyPassword(passwordActual, usuario.passwordHash);
  if (!valid) return apiError("Contraseña actual incorrecta", 400);

  await prisma.usuario.update({
    where: { id: session!.userId },
    data: { passwordHash: await hashPassword(passwordNueva) },
  });

  return apiSuccess({ ok: true });
}
