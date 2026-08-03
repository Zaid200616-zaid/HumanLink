import { prisma } from "@/lib/prisma";

/**
 * Devuelve los niveles de aprobación configurados para un módulo.
 * Si no hay workflow activo, devuelve null (se usa la lógica por defecto).
 */
export async function obtenerNivelesWorkflow(modulo: string): Promise<string[] | null> {
  const wf = await prisma.workflowAprobacion.findFirst({
    where: { modulo, activo: true },
    orderBy: { createdAt: "desc" },
  });
  if (!wf) return null;
  try {
    const niveles = JSON.parse(wf.niveles) as string[];
    return Array.isArray(niveles) ? niveles : null;
  } catch {
    return null;
  }
}

/**
 * Decide si una solicitud requiere aprobación de supervisor según el workflow.
 * Por defecto (sin workflow) requiere supervisor si el departamento tiene uno.
 */
export async function requiereSupervisor(
  modulo: string,
  tieneSupervisorDepto: boolean
): Promise<boolean> {
  const niveles = await obtenerNivelesWorkflow(modulo);
  if (niveles === null) return tieneSupervisorDepto;
  return niveles.includes("Supervisor") && tieneSupervisorDepto;
}
