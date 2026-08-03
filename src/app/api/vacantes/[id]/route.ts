import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { validarLimiteVacantesDepartamento } from "@/lib/departamento-vacantes";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  titulo: z.string().min(3).optional(),
  descripcion: z.string().min(10).optional(),
  requisitos: z.string().optional().nullable(),
  departamentoId: z.number().int().positive().optional(),
  cupoTotal: z.number().int().positive().optional(),
  estado: z.enum(["ABIERTA", "CERRADA", "PAUSADA"]).optional(),
  modalidad: z.string().optional().nullable(),
  tipoEmpleo: z.string().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  salario: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("vacantes:read");
  if (error) return error;

  const id = parseInt((await params).id);
  const vacante = await prisma.vacante.findUnique({
    where: { id },
    include: {
      departamento: { include: { organizacion: true } },
      _count: { select: { candidatos: true } },
    },
  });
  if (!vacante) return apiError("Vacante no encontrada", 404);
  return apiSuccess(vacante);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth("vacantes:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const actual = await prisma.vacante.findUnique({ where: { id } });
  if (!actual) return apiError("Vacante no encontrada", 404);

  const deptId = parsed.data.departamentoId ?? actual.departamentoId;
  if (parsed.data.departamentoId && parsed.data.departamentoId !== actual.departamentoId) {
    const limite = await validarLimiteVacantesDepartamento(parsed.data.departamentoId, 1);
    if (!limite.ok) return apiError(limite.error, 409);
  }

  let cupoDisponible = actual.cupoDisponible;
  if (parsed.data.cupoTotal !== undefined) {
    const diff = parsed.data.cupoTotal - actual.cupoTotal;
    cupoDisponible = Math.max(0, actual.cupoDisponible + diff);
  }

  const vacante = await prisma.vacante.update({
    where: { id },
    data: {
      ...parsed.data,
      departamentoId: deptId,
      cupoDisponible,
    },
    include: { departamento: true },
  });

  return apiSuccess(vacante);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("vacantes:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const vacante = await prisma.vacante.findUnique({
    where: { id },
    include: { _count: { select: { candidatos: true } } },
  });
  if (!vacante) return apiError("Vacante no encontrada", 404);

  const pendientes = await prisma.candidato.count({
    where: {
      vacanteId: id,
      etapa: { notIn: ["CONTRATADO", "RECHAZADO"] },
    },
  });

  if (pendientes > 0) {
    await prisma.vacante.update({
      where: { id },
      data: { estado: "CERRADA" },
    });
    return apiSuccess({ desactivada: true });
  }

  await prisma.vacante.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
