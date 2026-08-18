import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("asistencias:read");
  if (error) return error;

  const id = parseInt((await params).id);
  const asistencia = await prisma.asistencia.findUnique({
    where: { id },
    include: { empleado: { include: { departamento: true } } },
  });
  if (!asistencia) return apiError("Registro no encontrado", 404);
  return apiSuccess(asistencia);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth("asistencias:write");
  if (error || !session) return error;

  if (session.rol !== "Administrador" && session.rol !== "Recursos Humanos") {
    return apiError("Sin permisos para modificar asistencias", 403);
  }

  const id = parseInt((await params).id);
  const body = await request.json();
  const { horaEntrada, horaSalida, estado, notas, fecha } = body;

  if (!estado) return apiError("Estado requerido");

  const asistencia = await prisma.asistencia.update({
    where: { id },
    data: {
      horaEntrada,
      horaSalida,
      estado,
      notas,
      ...(fecha ? { fecha: new Date(fecha) } : {}),
    },
    include: { empleado: { include: { departamento: true } } },
  });

  return apiSuccess(asistencia);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth("asistencias:write");
  if (error || !session) return error;

  if (session.rol !== "Administrador") {
    return apiError("Solo el Administrador puede eliminar asistencias", 403);
  }

  const id = parseInt((await params).id);
  await prisma.asistencia.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
