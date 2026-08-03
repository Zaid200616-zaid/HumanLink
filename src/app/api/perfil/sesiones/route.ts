import { NextRequest } from "next/server";
import { apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const sesiones = await prisma.sesionUsuario.findMany({
    where: { usuarioId: session!.userId, activa: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return apiSuccess(sesiones);
}

export async function DELETE(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const currentHash = token ? crypto.createHash("sha256").update(token).digest("hex") : null;

  await prisma.sesionUsuario.updateMany({
    where: {
      usuarioId: session!.userId,
      activa: true,
      ...(currentHash ? { NOT: { tokenHash: currentHash } } : {}),
    },
    data: { activa: false },
  });
  return apiSuccess({ ok: true, mensaje: "Otras sesiones cerradas" });
}
