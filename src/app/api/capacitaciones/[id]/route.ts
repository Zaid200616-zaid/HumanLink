import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  nombre: z.string().min(3).optional(),
  descripcion: z.string().optional().nullable(),
  instructor: z.string().optional().nullable(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional().nullable(),
  cupoMaximo: z.number().int().positive().optional(),
  estado: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("capacitaciones:read");
  if (error) return error;

  const id = parseInt((await params).id);
  const cap = await prisma.capacitacion.findUnique({
    where: { id },
    include: { _count: { select: { empleados: true } } },
  });
  if (!cap) return apiError("Capacitación no encontrada", 404);
  return apiSuccess(cap);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth("capacitaciones:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.fechaInicio) data.fechaInicio = new Date(parsed.data.fechaInicio);
  if (parsed.data.fechaFin !== undefined) {
    data.fechaFin = parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : null;
  }

  const cap = await prisma.capacitacion.update({
    where: { id },
    data,
  });
  return apiSuccess(cap);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("capacitaciones:write");
  if (error) return error;

  const id = parseInt((await params).id);
  await prisma.capacitacion.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
