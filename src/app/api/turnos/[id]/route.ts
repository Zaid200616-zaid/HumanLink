import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const turnoSchema = z.object({
  nombre: z.string().min(2).optional(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  descripcion: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

// RF-H20
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const id = parseInt((await params).id);
  const turno = await prisma.turno.findUnique({
    where: { id },
    include: {
      empleados: {
        select: { id: true, numeroEmpleado: true, nombre: true, apellidoPaterno: true, turnoId: true },
        orderBy: { apellidoPaterno: "asc" },
      },
      _count: { select: { empleados: true } },
    },
  });
  if (!turno) return apiError("Turno no encontrado", 404);
  return apiSuccess(turno);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth("turnos:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const body = await request.json();
  const parsed = turnoSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const turno = await prisma.turno.update({
    where: { id },
    data: parsed.data,
    include: {
      empleados: {
        select: { id: true, numeroEmpleado: true, nombre: true, apellidoPaterno: true, turnoId: true },
        orderBy: { apellidoPaterno: "asc" },
      },
      _count: { select: { empleados: true } },
    },
  });
  return apiSuccess(turno);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("turnos:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const turno = await prisma.turno.findUnique({
    where: { id },
    include: { _count: { select: { empleados: true } } },
  });
  if (!turno) return apiError("Turno no encontrado", 404);

  if (turno._count.empleados > 0) {
    const desactivado = await prisma.turno.update({
      where: { id },
      data: { activo: false },
      include: { _count: { select: { empleados: true } } },
    });
    return apiSuccess({ desactivado: true, turno: desactivado });
  }

  await prisma.turno.delete({ where: { id } });
  return apiSuccess({ eliminado: true });
}
