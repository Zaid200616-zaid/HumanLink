import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { EstadoAsistencia } from "@prisma/client";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("asistencias:write");
  if (error) return error;

  const body = await request.json();
  const { registros } = body;
  if (!Array.isArray(registros) || registros.length === 0) {
    return apiError("Array registros requerido: [{ empleadoId, fecha, horaEntrada?, estado? }]");
  }

  let importados = 0;
  for (const r of registros) {
    if (!r.empleadoId || !r.fecha) continue;
    const estado = (r.estado as EstadoAsistencia) || "PUNTUAL";
    await prisma.asistencia.upsert({
      where: {
        empleadoId_fecha: {
          empleadoId: parseInt(r.empleadoId),
          fecha: new Date(r.fecha),
        },
      },
      create: {
        empleadoId: parseInt(r.empleadoId),
        fecha: new Date(r.fecha),
        horaEntrada: r.horaEntrada,
        horaSalida: r.horaSalida,
        estado,
      },
      update: {
        horaEntrada: r.horaEntrada,
        horaSalida: r.horaSalida,
        estado,
      },
    });
    importados++;
  }

  return apiSuccess({ importados });
}
