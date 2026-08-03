import { prisma } from "@/lib/prisma";
import { EstadoAsistencia } from "@prisma/client";

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const fin = new Date(end);
  fin.setHours(0, 0, 0, 0);
  while (cur <= fin) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export async function sincronizarAsistenciasSolicitud(
  empleadoId: number,
  fechaInicio: Date,
  fechaFin: Date,
  tipo: "VACACION" | "PERMISO"
) {
  const estado: EstadoAsistencia = tipo === "VACACION" ? "VACACION" : "PERMISO";
  const dias = eachDay(fechaInicio, fechaFin);

  for (const fecha of dias) {
    const dow = fecha.getDay();
    if (dow === 0 || dow === 6) continue;

    await prisma.asistencia.upsert({
      where: {
        empleadoId_fecha: {
          empleadoId,
          fecha,
        },
      },
      create: {
        empleadoId,
        fecha,
        estado,
        notas: `Generado por solicitud ${tipo}`,
      },
      update: {
        estado,
        notas: `Actualizado por solicitud ${tipo}`,
      },
    });
  }
}
