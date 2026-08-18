import type { SessionPayload } from "./auth";
import { prisma } from "./prisma";

/** Resuelve el empleado vinculado a la sesión (JWT o consulta a BD). */
export async function resolveEmpleadoId(session: SessionPayload): Promise<number | undefined> {
  if (session.empleadoId) return session.empleadoId;
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { empleado: { select: { id: true } } },
  });
  return usuario?.empleado?.id ?? undefined;
}
