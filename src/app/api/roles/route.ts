import { apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAuth("roles:read");
  if (error) return error;

  const roles = await prisma.rol.findMany({
    include: { _count: { select: { usuarios: true } } },
  });

  return apiSuccess(roles);
}
