import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const asignarSchema = z.object({
  empleadoIds: z.array(z.number().int().positive()),
});

// RF-H20 - Asignar empleados al turno (modal con checkboxes)
export async function POST(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth("turnos:write");
  if (error) return error;

  const turnoId = parseInt((await params).id);
  const turno = await prisma.turno.findUnique({ where: { id: turnoId } });
  if (!turno) return apiError("Turno no encontrado", 404);
  if (!turno.activo) return apiError("No se pueden asignar empleados a un turno inactivo", 400);

  const body = await request.json();
  const parsed = asignarSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const { empleadoIds } = parsed.data;
  const idsSet = new Set(empleadoIds);

  await prisma.$transaction([
    prisma.empleado.updateMany({
      where: { turnoId, id: { notIn: [...idsSet] } },
      data: { turnoId: null },
    }),
    ...empleadoIds.map((empleadoId) =>
      prisma.empleado.update({
        where: { id: empleadoId },
        data: { turnoId },
      })
    ),
  ]);

  const actualizado = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: {
      empleados: {
        select: { id: true, numeroEmpleado: true, nombre: true, apellidoPaterno: true, turnoId: true },
        orderBy: { apellidoPaterno: "asc" },
      },
      _count: { select: { empleados: true } },
    },
  });

  return apiSuccess(actualizado);
}
