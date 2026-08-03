import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { MSG_DEPT_SIN_AUTORIZACION, puedeModificarDepartamentos } from "@/lib/departamentos-auth";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  accion: z.enum(["asignar", "remover"]),
  empleadoId: z.number().int().positive(),
});

// RF-H19 — Empleados del departamento
export async function POST(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!puedeModificarDepartamentos(session.rol)) {
    return apiError(MSG_DEPT_SIN_AUTORIZACION, 403);
  }

  const departamentoId = parseInt((await params).id);
  const dept = await prisma.departamento.findUnique({ where: { id: departamentoId } });
  if (!dept) return apiError("Departamento no encontrado", 404);

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Datos inválidos");

  const { accion, empleadoId } = parsed.data;

  if (accion === "asignar") {
    await prisma.empleado.update({
      where: { id: empleadoId },
      data: { departamentoId },
    });
  } else {
    const emp = await prisma.empleado.findUnique({ where: { id: empleadoId } });
    if (emp?.departamentoId !== departamentoId) {
      return apiError("El empleado no pertenece a este departamento", 400);
    }
    await prisma.empleado.update({
      where: { id: empleadoId },
      data: { departamentoId: null },
    });
  }

  const empleados = await prisma.empleado.findMany({
    where: { departamentoId },
    select: { id: true, nombre: true, apellidoPaterno: true, numeroEmpleado: true, puesto: true },
    orderBy: { apellidoPaterno: "asc" },
  });

  return apiSuccess({ empleados });
}
