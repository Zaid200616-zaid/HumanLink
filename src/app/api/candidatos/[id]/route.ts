import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { provisionarAccesoContratado } from "@/lib/contratacion-acceso";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth("candidatos:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const body = await request.json();

  const schema = z.object({
    etapa: z.enum([
      "RECEPCION", "REVISION_CV", "ENTREVISTA", "EVALUACION",
      "OFERTA", "CONTRATADO", "RECHAZADO",
    ]).optional(),
    notas: z.string().optional(),
    turnoId: z.number().int().positive().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Datos inválidos");
  }

  const candidatoPrev = await prisma.candidato.findUnique({
    where: { id },
    include: { vacante: { include: { departamento: true } } },
  });
  if (!candidatoPrev) return apiError("Candidato no encontrado", 404);

  const candidato = await prisma.candidato.update({
    where: { id },
    data: { etapa: parsed.data.etapa, notas: parsed.data.notas },
    include: { vacante: { include: { departamento: true } } },
  });

  let acceso: Awaited<ReturnType<typeof provisionarAccesoContratado>> | null = null;

  if (parsed.data.etapa === "CONTRATADO" && candidatoPrev.etapa !== "CONTRATADO") {
    try {
      acceso = await provisionarAccesoContratado(candidato, parsed.data.turnoId);
      await registrarAuditoria(
        session!.userId,
        session!.email,
        "CONTRATAR",
        "candidatos",
        acceso.email
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear el acceso del empleado";
      return apiError(msg, 500);
    }
  }

  return apiSuccess({
    ...candidato,
    acceso: acceso
      ? {
          email: acceso.email,
          passwordTemporal: acceso.passwordTemporal,
          turnoId: acceso.turnoId,
          mensaje:
            "Comparta el correo del empleado y la contraseña temporal HumanLink2026! (puede cambiarla en Mi Perfil).",
        }
      : undefined,
  });
}
