import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { DEPT_ROLES_ESCRITURA } from "@/lib/departamentos-auth";

/** RNF-08 — Bitácora de auditoría de departamentos */
export async function GET() {
  const { error, session } = await requireAuth("departamentos:read");
  if (error || !session) return error;

  if (!DEPT_ROLES_ESCRITURA.includes(session.rol as "Administrador" | "Supervisor")) {
    return apiError("No posee autorización para consultar la bitácora de departamentos", 403);
  }

  const logs = await prisma.auditoriaLog.findMany({
    where: { modulo: "departamentos" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return apiSuccess(
    logs.map((l) => ({
      id: l.id,
      usuario: l.email || `Usuario #${l.usuarioId}`,
      fecha: l.createdAt.toISOString().slice(0, 10),
      hora: l.createdAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      accion: l.accion,
      departamento: l.detalle || "—",
    }))
  );
}
