import { apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session!.userId },
    include: {
      rol: true,
      empleado: { include: { departamento: { include: { organizacion: true } }, turno: true } },
    },
  });

  return apiSuccess({
    id: usuario?.id,
    email: usuario?.email,
    rol: usuario?.rol.nombre,
    nombreCompleto: usuario?.empleado
      ? `${usuario.empleado.nombre} ${usuario.empleado.apellidoPaterno}${
          usuario.empleado.apellidoMaterno ? ` ${usuario.empleado.apellidoMaterno}` : ""
        }`.trim()
      : usuario?.email?.split("@")[0] ?? "Usuario",
    numeroEmpleado: usuario?.empleado?.numeroEmpleado ?? null,
    fotoUrl: usuario?.empleado?.fotoUrl ?? null,
    empleado: usuario?.empleado
      ? {
          id: usuario.empleado.id,
          nombre: usuario.empleado.nombre,
          apellidoPaterno: usuario.empleado.apellidoPaterno,
          apellidoMaterno: usuario.empleado.apellidoMaterno,
          numeroEmpleado: usuario.empleado.numeroEmpleado,
          fotoUrl: usuario.empleado.fotoUrl,
          puesto: usuario.empleado.puesto,
          departamento: usuario.empleado.departamento,
          turno: usuario.empleado.turno,
        }
      : null,
  });
}
