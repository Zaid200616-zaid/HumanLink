import { prisma } from "@/lib/prisma";

export async function registrarAuditoria(
  usuarioId: number | null | undefined,
  email: string | null | undefined,
  accion: string,
  modulo: string,
  detalle?: string
) {
  try {
    await prisma.auditoriaLog.create({
      data: {
        usuarioId: usuarioId ?? undefined,
        email: email ?? undefined,
        accion,
        modulo,
        detalle,
      },
    });
  } catch {
    // no bloquear operación principal
  }
}
