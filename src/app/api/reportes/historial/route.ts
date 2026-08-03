import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const generarSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  tipo: z.string().min(2),
});

export async function GET() {
  const { error } = await requireAuth("reportes:read");
  if (error) return error;

  const historial = await prisma.historialReporte.findMany({
    include: {
      usuario: { select: { email: true, empleado: { select: { nombre: true, apellidoPaterno: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return apiSuccess(historial);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth("reportes:read");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = generarSchema.safeParse(body);
  if (!parsed.success) return apiError("Indique mes (YYYY-MM) y tipo de reporte");

  const registro = await prisma.historialReporte.create({
    data: {
      mes: parsed.data.mes,
      tipo: parsed.data.tipo,
      usuarioId: session.userId,
    },
  });

  return apiSuccess(registro, 201);
}
