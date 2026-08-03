import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { MSG_DEPT_SIN_AUTORIZACION, puedeModificarDepartamentos } from "@/lib/departamentos-auth";

type Params = { params: Promise<{ id: string }> };

const ROLES_ESCRITURA = ["Administrador", "Supervisor"];

const updateSchema = z.object({
  nombre: z.string().min(2).optional(),
  descripcion: z.string().optional().nullable(),
  supervisorId: z.number().int().nullable().optional(),
  ubicacion: z.string().optional().nullable(),
  cantidadVacantes: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth("departamentos:read");
  if (error || !session) return error;

  const id = parseInt((await params).id);
  const dept = await prisma.departamento.findUnique({
    where: { id },
    include: {
      organizacion: true,
      supervisor: { select: { id: true, nombre: true, apellidoPaterno: true, numeroEmpleado: true } },
      empleados: {
        select: { id: true, nombre: true, apellidoPaterno: true, numeroEmpleado: true, puesto: true },
        orderBy: { apellidoPaterno: "asc" },
      },
      vacantes: {
        include: { _count: { select: { candidatos: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { empleados: true, vacantes: true } },
    },
  });

  if (!dept) return apiError("Departamento no encontrado", 404);

  if (session.rol === "Supervisor" && session.empleadoId) {
    const propio =
      dept.supervisorId === session.empleadoId ||
      dept.empleados.some((e) => e.id === session.empleadoId);
    if (!propio) return apiError("No tienes acceso a este departamento", 403);
  }

  return apiSuccess(dept);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!puedeModificarDepartamentos(session.rol)) {
    return apiError(MSG_DEPT_SIN_AUTORIZACION, 403);
  }

  const id = parseInt((await params).id);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const dept = await prisma.departamento.update({
    where: { id },
    data: parsed.data,
    include: {
      organizacion: true,
      supervisor: { select: { id: true, nombre: true, apellidoPaterno: true } },
      _count: { select: { empleados: true, vacantes: true } },
    },
  });

  await registrarAuditoria(session.userId, session.email, "MODIFICACION", "departamentos", `Modificación de "${dept.nombre}" (#${dept.id})`);
  return apiSuccess(dept);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!puedeModificarDepartamentos(session.rol)) {
    return apiError(MSG_DEPT_SIN_AUTORIZACION, 403);
  }

  const id = parseInt((await params).id);
  const dept = await prisma.departamento.findUnique({
    where: { id },
    include: { _count: { select: { empleados: true, vacantes: true } } },
  });
  if (!dept) return apiError("Departamento no encontrado", 404);

  if (dept._count.empleados > 0 || dept._count.vacantes > 0) {
    const desactivado = await prisma.departamento.update({
      where: { id },
      data: { activo: false },
    });
    await registrarAuditoria(session.userId, session.email, "DESACTIVACION", "departamentos", `Desactivación de "${dept.nombre}" (#${id})`);
    return apiSuccess({ desactivado: true, departamento: desactivado });
  }

  await prisma.departamento.delete({ where: { id } });
  await registrarAuditoria(session.userId, session.email, "ELIMINACION", "departamentos", `Eliminación de "${dept.nombre}" (#${id})`);
  return apiSuccess({ eliminado: true });
}
