import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// RF-H09 - Expediente digital
export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const id = parseInt((await params).id);

  if (session!.rol === "Empleado" && session!.empleadoId !== id) {
    return apiError("Solo puedes ver tu propio expediente", 403);
  }

  const empleado = await prisma.empleado.findUnique({
    where: { id },
    include: {
      departamento: { include: { organizacion: true } },
      turno: true,
      asistencias: { orderBy: { fecha: "desc" }, take: 30 },
      capacitaciones: { include: { capacitacion: true } },
      solicitudes: { orderBy: { createdAt: "desc" } },
      evaluaciones: { include: { evaluador: true } },
      documentos: { orderBy: { createdAt: "desc" } },
      quejas: true,
    },
  });

  if (!empleado) return apiError("Empleado no encontrado", 404);
  return apiSuccess(empleado);
}

// RNF13 - Validaciones de integridad
const CURP_RE = /^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]{2}$/;
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const updateSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellidoPaterno: z.string().min(2).optional(),
  apellidoMaterno: z.string().optional(),
  telefono: z.string().optional(),
  puesto: z.string().optional(),
  curp: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => CURP_RE.test(v), "CURP inválida (18 caracteres)")
    .optional(),
  rfc: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => RFC_RE.test(v), "RFC inválido (12-13 caracteres)")
    .optional(),
  departamentoId: z.number().int().nullable().optional(),
  turnoId: z.number().int().nullable().optional(),
  activo: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth("empleados:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Datos inválidos");
  }

  const { curp, rfc } = parsed.data;

  // RNF13 - Evitar duplicados de CURP/RFC contra otros empleados
  if (curp || rfc) {
    const duplicado = await prisma.empleado.findFirst({
      where: {
        id: { not: id },
        OR: [...(curp ? [{ curp }] : []), ...(rfc ? [{ rfc }] : [])],
      },
      select: { curp: true, rfc: true },
    });
    if (duplicado) {
      const campo = curp && duplicado.curp === curp ? "CURP" : "RFC";
      return apiError(`Ya existe otro empleado con ese ${campo}`, 409);
    }
  }

  try {
    const empleado = await prisma.empleado.update({
      where: { id },
      data: parsed.data,
      include: { departamento: true },
    });
    return apiSuccess(empleado);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return apiError("Ya existe otro empleado con esos datos únicos", 409);
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("empleados:write");
  if (error) return error;

  const id = parseInt((await params).id);
  await prisma.empleado.update({ where: { id }, data: { activo: false } });
  return apiSuccess({ deleted: true });
}
