import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { MSG_DEPT_SIN_AUTORIZACION, puedeModificarDepartamentos } from "@/lib/departamentos-auth";

// RF-H19 + RNF-08
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth("departamentos:read");
  if (error || !session) return error;

  const meta = request.nextUrl.searchParams.get("meta");
  if (meta === "1") {
    const [organizaciones, empleados] = await Promise.all([
      prisma.organizacion.findMany({
        where: { activa: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.empleado.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, apellidoPaterno: true, numeroEmpleado: true, departamentoId: true },
        orderBy: { apellidoPaterno: "asc" },
      }),
    ]);
    return apiSuccess({ organizaciones, empleados });
  }

  const orgId = request.nextUrl.searchParams.get("organizacionId");
  const where: Record<string, unknown> = orgId ? { organizacionId: parseInt(orgId) } : {};

  if (session.rol === "Supervisor" && session.empleadoId) {
    where.OR = [
      { supervisorId: session.empleadoId },
      { empleados: { some: { id: session.empleadoId } } },
    ];
  }

  const departamentos = await prisma.departamento.findMany({
    where,
    include: {
      organizacion: true,
      supervisor: { select: { id: true, nombre: true, apellidoPaterno: true } },
      _count: { select: { empleados: true, vacantes: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return apiSuccess(departamentos);
}

const deptSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  organizacionId: z.number().int().positive(),
  supervisorId: z.number().int().positive().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  cantidadVacantes: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!puedeModificarDepartamentos(session.rol)) {
    return apiError(MSG_DEPT_SIN_AUTORIZACION, 403);
  }

  const body = await request.json();
  const parsed = deptSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message || "Datos inválidos");

  const dept = await prisma.departamento.create({
    data: { ...parsed.data, activo: parsed.data.activo ?? true },
    include: {
      organizacion: true,
      supervisor: { select: { id: true, nombre: true, apellidoPaterno: true } },
      _count: { select: { empleados: true, vacantes: true } },
    },
  });

  await registrarAuditoria(session.userId, session.email, "ALTA", "departamentos", `Alta de "${dept.nombre}" (#${dept.id})`);
  return apiSuccess(dept, 201);
}
