import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const { id } = await ctx.params;
  const quejaId = parseInt(id, 10);
  if (!quejaId) return apiError("Identificador inválido");

  const queja = await prisma.quejaLaboral.findUnique({
    where: { id: quejaId },
    select: { empleadoId: true },
  });
  if (!queja) return apiError("Queja no encontrada", 404);

  const puedeGestionar =
    hasPermission(session.permisos, "quejas:*") ||
    hasPermission(session.permisos, "quejas:read");
  const esPropia = session.empleadoId != null && session.empleadoId === queja.empleadoId;

  if (!puedeGestionar && !esPropia) {
    return apiError("Sin permisos para ver el historial de esta queja", 403);
  }

  const historial = await prisma.quejaHistorial.findMany({
    where: { quejaId },
    include: { usuario: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(
    historial.map((h) => ({
      id: h.id,
      usuario: h.usuario.email,
      fecha: h.createdAt.toISOString().slice(0, 10),
      hora: h.createdAt.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
    }))
  );
}
