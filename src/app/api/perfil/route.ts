import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

async function resolverEmpleado(session: { userId: number; email: string; empleadoId?: number | null }) {
  if (session.empleadoId) {
    return prisma.empleado.findUnique({
      where: { id: session.empleadoId },
      include: {
        departamento: { include: { organizacion: true } },
        turno: true,
      },
    });
  }
  return prisma.empleado.findUnique({
    where: { email: session.email },
    include: {
      departamento: { include: { organizacion: true } },
      turno: true,
    },
  });
}

// RF-H14 - Perfil de usuario
export async function GET() {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    include: { rol: true },
  });
  if (!usuario) return apiError("Usuario no encontrado", 404);

  const empleado = await resolverEmpleado(session);

  return apiSuccess({
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    empleado,
    numeroEmpleado: empleado?.numeroEmpleado ?? null,
  });
}

const profileSchema = z.object({
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  fotoUrl: z.string().nullable().optional(),
});

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const emp = await resolverEmpleado(session);
  if (emp) {
    await prisma.empleado.update({
      where: { id: emp.id },
      data: {
        telefono: parsed.data.telefono,
        ...(parsed.data.fotoUrl !== undefined && { fotoUrl: parsed.data.fotoUrl }),
        ...(parsed.data.email ? { email: parsed.data.email } : {}),
      },
    });
    if (!session.empleadoId && !emp.usuarioId) {
      await prisma.empleado.update({
        where: { id: emp.id },
        data: { usuarioId: session.userId },
      });
    }
  }

  if (parsed.data.email) {
    await prisma.usuario.update({
      where: { id: session.userId },
      data: { email: parsed.data.email },
    });
  }

  return apiSuccess({ updated: true });
}
