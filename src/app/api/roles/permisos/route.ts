import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAuth("roles:read");
  if (error) return error;
  const roles = await prisma.rol.findMany();
  return apiSuccess(roles.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    permisos: JSON.parse(r.permisos),
  })));
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth("roles:*");
  if (error) return error;
  const body = await request.json();
  if (!body.rolId || !body.permisos) return apiError("rolId y permisos requeridos");
  const rol = await prisma.rol.update({
    where: { id: parseInt(body.rolId) },
    data: { permisos: JSON.stringify(body.permisos) },
  });
  return apiSuccess(rol);
}
