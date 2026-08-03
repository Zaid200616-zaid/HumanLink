import { NextRequest } from "next/server";
import { apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const mes = request.nextUrl.searchParams.get("mes");
  const year = request.nextUrl.searchParams.get("year");
  const now = new Date();
  const y = year ? parseInt(year) : now.getFullYear();
  const m = mes ? parseInt(mes) - 1 : now.getMonth();
  const inicio = new Date(y, m, 1);
  const fin = new Date(y, m + 1, 0);

  const solicitudes = await prisma.solicitudPermiso.findMany({
    where: {
      estado: { in: ["PENDIENTE", "APROBADA"] },
      fechaInicio: { lte: fin },
      fechaFin: { gte: inicio },
    },
    include: {
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidoPaterno: true,
          fotoUrl: true,
          departamento: { select: { nombre: true } },
        },
      },
    },
  });

  return apiSuccess({ year: y, month: m + 1, solicitudes });
}
