import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { inicioDelDia, rangoPeriodo } from "@/lib/asistencia-registro";

// RF-H06 - Control de checadas | RNF02 colores
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth("asistencias:read");
  if (error || !session) return error;

  const fecha = request.nextUrl.searchParams.get("fecha");
  const periodo = request.nextUrl.searchParams.get("periodo") as "dia" | "semana" | "mes" | null;
  const empleadoIdParam = request.nextUrl.searchParams.get("empleadoId");

  const empleadoId =
    session.rol === "Empleado" && session.empleadoId
      ? session.empleadoId
      : empleadoIdParam
        ? parseInt(empleadoIdParam)
        : undefined;

  let fechaFilter: { gte?: Date; lte?: Date } | { equals?: Date } | undefined;
  if (periodo === "dia" || periodo === "semana" || periodo === "mes") {
    const { desde, hasta } = rangoPeriodo(periodo);
    fechaFilter = { gte: desde, lte: hasta };
  } else if (fecha) {
    fechaFilter = { equals: inicioDelDia(new Date(fecha)) };
  }

  const asistencias = await prisma.asistencia.findMany({
    where: {
      ...(fechaFilter ? { fecha: fechaFilter } : {}),
      ...(empleadoId ? { empleadoId } : {}),
    },
    include: {
      empleado: { include: { departamento: true, turno: true } },
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  return apiSuccess(asistencias);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("asistencias:write");
  if (error) return error;

  return apiError(
    "El registro manual de asistencias no está disponible. Use Registrar Entrada o edite un registro existente.",
    403,
  );
}
