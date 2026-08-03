import { apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [empleados, vacantes, contrataciones, capacitaciones] = await Promise.all([
    prisma.empleado.count({ where: { activo: true } }),
    prisma.vacante.count({ where: { estado: "ABIERTA", cupoDisponible: { gt: 0 } } }),
    prisma.candidato.count({ where: { etapa: "CONTRATADO" } }),
    prisma.capacitacion.count(),
  ]);

  return apiSuccess({
    empleados: Math.max(empleados, 1),
    vacantes,
    contrataciones,
    capacitaciones,
  });
}
