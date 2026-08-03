import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error, session } = await requireAuth("capacitaciones:read");
  if (error || !session) return error;

  const capacitaciones = await prisma.capacitacion.findMany({
    include: {
      _count: { select: { empleados: true } },
      empleados: session.empleadoId
        ? { where: { empleadoId: session.empleadoId }, take: 1 }
        : undefined,
    },
    orderBy: { fechaInicio: "desc" },
  });

  const result = capacitaciones.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    instructor: c.instructor,
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin,
    cupoMaximo: c.cupoMaximo,
    estado: c.estado,
    cupoOcupado: c._count.empleados,
    cupoDisponible: c.cupoMaximo - c._count.empleados,
    porcentajeOcupacion: Math.round((c._count.empleados / c.cupoMaximo) * 100),
    inscrito: session.empleadoId ? c.empleados.length > 0 : false,
  }));

  return apiSuccess(result);
}

const capSchema = z.object({
  nombre: z.string().min(3),
  descripcion: z.string().optional(),
  instructor: z.string().optional(),
  fechaInicio: z.string(),
  fechaFin: z.string().optional(),
  cupoMaximo: z.number().int().positive().default(30),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("capacitaciones:write");
  if (error) return error;

  const body = await request.json();
  const parsed = capSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const cap = await prisma.capacitacion.create({
    data: {
      ...parsed.data,
      fechaInicio: new Date(parsed.data.fechaInicio),
      fechaFin: parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : null,
    },
  });

  return apiSuccess(cap, 201);
}
