import { prisma } from "@/lib/prisma";

/** RF-H19 — Valida que no se supere cantidadVacantes del departamento (0 = sin límite). */
export async function validarLimiteVacantesDepartamento(
  departamentoId: number,
  incremento = 1
): Promise<{ ok: true } | { ok: false; error: string }> {
  const dept = await prisma.departamento.findUnique({
    where: { id: departamentoId },
    include: { _count: { select: { vacantes: true } } },
  });
  if (!dept) return { ok: false, error: "Departamento no encontrado" };
  if (dept.cantidadVacantes <= 0) return { ok: true };
  if (dept._count.vacantes + incremento > dept.cantidadVacantes) {
    return {
      ok: false,
      error: `El departamento permite máximo ${dept.cantidadVacantes} vacante(s). Actualmente tiene ${dept._count.vacantes}.`,
    };
  }
  return { ok: true };
}
