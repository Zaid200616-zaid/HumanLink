import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

import { validarLimiteVacantesDepartamento } from "@/lib/departamento-vacantes";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("vacantes:read");
  if (error) return error;

  const departamentoId = request.nextUrl.searchParams.get("departamentoId");
  const estado = request.nextUrl.searchParams.get("estado");

  const vacantes = await prisma.vacante.findMany({
    where: {
      ...(departamentoId ? { departamentoId: parseInt(departamentoId) } : {}),
      ...(estado ? { estado: estado as "ABIERTA" | "CERRADA" | "PAUSADA" } : {}),
    },
    include: {
      departamento: { include: { organizacion: true } },
      _count: { select: { candidatos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(vacantes);
}

const vacanteSchema = z.object({
  titulo: z.string().min(3),
  descripcion: z.string().min(10),
  requisitos: z.string().optional(),
  departamentoId: z.number().int().positive(),
  cupoTotal: z.number().int().positive().default(1),
  modalidad: z.string().optional(),
  tipoEmpleo: z.string().optional(),
  ubicacion: z.string().optional(),
  salario: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("vacantes:write");
  if (error) return error;

  const body = await request.json();
  const parsed = vacanteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Datos inválidos");
  }

  const limite = await validarLimiteVacantesDepartamento(parsed.data.departamentoId, 1);
  if (!limite.ok) return apiError(limite.error, 409);

  const vacante = await prisma.vacante.create({
    data: {
      ...parsed.data,
      cupoDisponible: parsed.data.cupoTotal,
    },
    include: { departamento: true },
  });

  return apiSuccess(vacante, 201);
}
