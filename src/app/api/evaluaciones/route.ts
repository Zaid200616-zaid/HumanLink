import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth";

// RF-H11
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const empleadoIdParam = request.nextUrl.searchParams.get("empleadoId");
  const canViewAll =
    hasPermission(session.permisos, "evaluaciones:write") ||
    session.rol === "Administrador" ||
    session.rol === "Recursos Humanos" ||
    session.rol === "Supervisor";

  let where = undefined;
  if (empleadoIdParam) {
    where = { empleadoId: parseInt(empleadoIdParam) };
  } else if (!canViewAll && session.empleadoId) {
    where = { empleadoId: session.empleadoId };
  } else if (!canViewAll) {
    return apiError("Sin permisos", 403);
  }

  const evaluaciones = await prisma.evaluacionDesempeno.findMany({
    where,
    include: { empleado: true, evaluador: true },
    orderBy: { fecha: "desc" },
  });

  return apiSuccess(evaluaciones);
}

const TIPOS = ["DESEMPENO", "ANUAL", "SEMESTRAL", "PERIODO_PRUEBA", "PROYECTO", "360"] as const;

const evalSchema = z.object({
  empleadoId: z.number().int(),
  tipo: z.enum(TIPOS).default("DESEMPENO"),
  periodo: z.string().min(2).optional(),
  comentarios: z.string().min(5),
  puntaje: z.number().int().min(0).max(100).optional(),
  fecha: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth("evaluaciones:write");
  if (error) return error;

  if (!session!.empleadoId) return apiError("Evaluador sin empleado asociado");

  const body = await request.json();
  const parsed = evalSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const { fecha, periodo, ...rest } = parsed.data;
  const fechaEval = fecha ? new Date(fecha) : new Date();

  const evaluacion = await prisma.evaluacionDesempeno.create({
    data: {
      ...rest,
      periodo: periodo || String(fechaEval.getFullYear()),
      fecha: fechaEval,
      evaluadorId: session!.empleadoId,
    },
    include: { empleado: true, evaluador: true },
  });

  return apiSuccess(evaluacion, 201);
}
