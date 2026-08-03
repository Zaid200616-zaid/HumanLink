import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notificarUsuarioId } from "@/lib/email";

const ROLES_GESTION = ["Administrador", "Recursos Humanos"];

const createSchema = z.object({
  usuarioId: z.number().int().positive(),
  titulo: z.string().min(2),
  mensaje: z.string().min(2),
  tipo: z.string().default("SISTEMA"),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  titulo: z.string().min(2).optional(),
  mensaje: z.string().min(2).optional(),
  tipo: z.string().optional(),
  leida: z.boolean().optional(),
});

// RF-H10
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const gestion = request.nextUrl.searchParams.get("gestion") === "1";
  if (gestion && ROLES_GESTION.includes(session.rol)) {
    const notificaciones = await prisma.notificacion.findMany({
      include: {
        usuario: { select: { email: true, empleado: { select: { nombre: true, apellidoPaterno: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return apiSuccess(notificaciones);
  }

  const notificaciones = await prisma.notificacion.findMany({
    where: { usuarioId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return apiSuccess(notificaciones);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!ROLES_GESTION.includes(session.rol)) {
    return apiError("Sin permisos", 403);
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Datos inválidos");

  const notif = await prisma.notificacion.create({
    data: parsed.data,
  });

  return apiSuccess(notif, 201);
}

export async function PATCH(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const body = await request.json();

  if (ROLES_GESTION.includes(session.rol) && body.id && (body.titulo || body.mensaje || body.tipo !== undefined)) {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError("Datos inválidos");
    const { id, ...data } = parsed.data;
    const notif = await prisma.notificacion.update({ where: { id }, data });
    return apiSuccess(notif);
  }

  const { id, leida } = body;
  const notif = await prisma.notificacion.update({
    where: { id: parseInt(id), usuarioId: session.userId },
    data: { leida: leida ?? true },
  });

  return apiSuccess(notif);
}

export async function DELETE(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!ROLES_GESTION.includes(session.rol)) {
    return apiError("Sin permisos", 403);
  }

  const id = parseInt(request.nextUrl.searchParams.get("id") || "0");
  if (!id) return apiError("ID requerido");

  await prisma.notificacion.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
