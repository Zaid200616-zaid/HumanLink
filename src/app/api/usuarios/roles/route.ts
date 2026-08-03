import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const assignSchema = z.object({
  usuarioId: z.number().int().positive(),
  rolId: z.number().int().positive(),
});

// RF-H07 — Asignación de roles a usuarios
const ROLES_LISTAR_USUARIOS = ["Administrador", "Recursos Humanos"];

export async function GET() {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const puedeListar =
    ROLES_LISTAR_USUARIOS.includes(session.rol) ||
    hasPermission(session.permisos, "roles:read");

  if (!puedeListar) return apiError("Sin permisos", 403);

  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: {
      id: true,
      email: true,
      rolId: true,
      rol: { select: { id: true, nombre: true } },
      empleado: { select: { nombre: true, apellidoPaterno: true, numeroEmpleado: true } },
    },
    orderBy: { email: "asc" },
  });

  return apiSuccess(usuarios);
}

export async function PATCH(request: NextRequest) {
  const { error, session } = await requireAuth("roles:write");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const { usuarioId, rolId } = parsed.data;

  const target = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { rol: true },
  });
  if (!target) return apiError("Usuario no encontrado", 404);

  if (target.rol.nombre === "Administrador" && target.id !== session.userId) {
    return apiError("No puede modificar usuarios con rol Administrador", 403);
  }

  const nuevoRol = await prisma.rol.findUnique({ where: { id: rolId } });
  if (!nuevoRol) return apiError("Rol no encontrado", 404);

  if (nuevoRol.nombre === "Administrador" && usuarioId !== session.userId) {
    return apiError("No se puede asignar el rol Administrador a otro usuario", 403);
  }

  if (target.rol.nombre === "Administrador" && nuevoRol.nombre !== "Administrador") {
    return apiError("No puede quitar el rol de Administrador a un Administrador", 403);
  }

  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { rolId },
    include: { rol: true, empleado: true },
  });

  return apiSuccess(usuario);
}
