import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { guardarArchivo } from "@/lib/uploads";

async function empleadoDelUsuario(usuarioId: number, email: string, empleadoId: number | null | undefined) {
  if (empleadoId) {
    return prisma.empleado.findUnique({ where: { id: empleadoId } });
  }
  return prisma.empleado.findUnique({ where: { email } });
}

// RF-H14 — Subir foto de perfil (archivo, no base64)
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const emp = await empleadoDelUsuario(session.userId, session.email, session.empleadoId);
  if (!emp) {
    return apiError("No hay un empleado vinculado a esta cuenta para guardar la foto", 400);
  }

  const form = await request.formData();
  const archivo = form.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return apiError("Seleccione una imagen", 400);
  }
  if (!archivo.type.startsWith("image/")) {
    return apiError("Formato no válido. Use JPG o PNG", 400);
  }
  if (archivo.size > 500_000) {
    return apiError("La imagen debe ser menor a 500 KB", 400);
  }

  const buf = Buffer.from(await archivo.arrayBuffer());
  const ruta = await guardarArchivo("avatars", archivo.name, buf);

  const actualizado = await prisma.empleado.update({
    where: { id: emp.id },
    data: { fotoUrl: ruta },
    select: { id: true, fotoUrl: true, numeroEmpleado: true },
  });

  if (!session.empleadoId) {
    await prisma.empleado.update({
      where: { id: emp.id },
      data: { usuarioId: session.userId },
    });
  }

  return apiSuccess(actualizado);
}
