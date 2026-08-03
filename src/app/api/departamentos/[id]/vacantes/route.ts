import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

import { validarLimiteVacantesDepartamento } from "@/lib/departamento-vacantes";
import { MSG_DEPT_SIN_AUTORIZACION, puedeModificarDepartamentos } from "@/lib/departamentos-auth";

type Params = { params: Promise<{ id: string }> };

const crearSchema = z.object({
  accion: z.literal("crear"),
  titulo: z.string().min(3),
  descripcion: z.string().min(10),
  requisitos: z.string().optional(),
  cupoTotal: z.number().int().positive().default(1),
});

const asociarSchema = z.object({
  accion: z.literal("asociar"),
  vacanteId: z.number().int().positive(),
});

const desasociarSchema = z.object({
  accion: z.literal("desasociar"),
  vacanteId: z.number().int().positive(),
});

// RF-H19 — Vacantes del departamento
export async function POST(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (!puedeModificarDepartamentos(session.rol)) {
    return apiError(MSG_DEPT_SIN_AUTORIZACION, 403);
  }

  const departamentoId = parseInt((await params).id);
  const dept = await prisma.departamento.findUnique({ where: { id: departamentoId } });
  if (!dept) return apiError("Departamento no encontrado", 404);

  const body = await request.json();

  if (body.accion === "crear") {
    const parsed = crearSchema.safeParse(body);
    if (!parsed.success) return apiError("Datos inválidos");
    const limite = await validarLimiteVacantesDepartamento(departamentoId, 1);
    if (!limite.ok) return apiError(limite.error, 409);
    await prisma.vacante.create({
      data: {
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion,
        requisitos: parsed.data.requisitos,
        departamentoId,
        cupoTotal: parsed.data.cupoTotal,
        cupoDisponible: parsed.data.cupoTotal,
      },
    });
  } else if (body.accion === "asociar") {
    const parsed = asociarSchema.safeParse(body);
    if (!parsed.success) return apiError("Datos inválidos");
    const vac = await prisma.vacante.findUnique({ where: { id: parsed.data.vacanteId } });
    if (!vac) return apiError("Vacante no encontrada", 404);
    if (vac.departamentoId !== departamentoId) {
      const limite = await validarLimiteVacantesDepartamento(departamentoId, 1);
      if (!limite.ok) return apiError(limite.error, 409);
    }
    await prisma.vacante.update({
      where: { id: parsed.data.vacanteId },
      data: { departamentoId },
    });
  } else if (body.accion === "desasociar") {
    const parsed = desasociarSchema.safeParse(body);
    if (!parsed.success) return apiError("Datos inválidos");
    const vac = await prisma.vacante.findUnique({
      where: { id: parsed.data.vacanteId },
      include: { _count: { select: { candidatos: true } } },
    });
    if (!vac || vac.departamentoId !== departamentoId) {
      return apiError("La vacante no está asociada a este departamento", 400);
    }
    if (vac._count.candidatos > 0) {
      return apiError("No se puede desasociar: la vacante tiene candidatos", 409);
    }
    await prisma.vacante.delete({ where: { id: parsed.data.vacanteId } });
  } else {
    return apiError("Acción no válida");
  }

  const vacantes = await prisma.vacante.findMany({
    where: { departamentoId },
    include: { _count: { select: { candidatos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ vacantes });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("departamentos:read");
  if (error) return error;

  const departamentoId = parseInt((await params).id);
  const vacantes = await prisma.vacante.findMany({
    where: { departamentoId },
    include: { _count: { select: { candidatos: true } } },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess(vacantes);
}
