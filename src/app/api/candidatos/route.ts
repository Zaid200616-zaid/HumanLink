import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth, handlePrismaError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notificarUsuarioId } from "@/lib/email";

// RNF01 - Solo recibir formularios cuando hay vacantes
// RNF10 - Bloquear cupo temporalmente
import { guardarArchivo } from "@/lib/uploads";

const candidatoSchema = z.object({
  nombre: z.string().min(2),
  apellidoPaterno: z.string().min(2),
  apellidoMaterno: z.string().optional(),
  email: z.string().email(),
  telefono: z.string().optional(),
  curp: z.string().optional(),
  rfc: z.string().optional(),
  direccion: z.string().optional(),
  escolaridad: z.string().optional(),
  experiencia: z.string().optional(),
  curriculum: z.string().optional(),
  cartaPresentacion: z.string().optional(),
  vacanteId: z.number().int().positive(),
});

async function guardarPdfCampo(
  form: FormData,
  field: string,
  folder: string
): Promise<string | undefined> {
  const archivo = form.get(field);
  if (!(archivo instanceof File) || archivo.size === 0) return undefined;
  if (archivo.type !== "application/pdf") {
    throw new Error(`El archivo ${field} debe ser PDF`);
  }
  if (archivo.size > 5 * 1024 * 1024) {
    throw new Error("PDF máximo 5 MB");
  }
  const buf = Buffer.from(await archivo.arrayBuffer());
  return guardarArchivo(folder, archivo.name, buf);
}

async function parseCandidatoBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    let curriculum: string | undefined;
    let cartaPresentacion: string | undefined;
    try {
      curriculum = await guardarPdfCampo(form, "curriculum", "curriculums");
      cartaPresentacion = await guardarPdfCampo(form, "cartaPresentacion", "cartas");
    } catch (e) {
      return { error: apiError(e instanceof Error ? e.message : "Archivo inválido", 400) };
    }
    const raw = {
      nombre: String(form.get("nombre") || ""),
      apellidoPaterno: String(form.get("apellidoPaterno") || ""),
      apellidoMaterno: String(form.get("apellidoMaterno") || "") || undefined,
      email: String(form.get("email") || ""),
      telefono: String(form.get("telefono") || "") || undefined,
      curp: String(form.get("curp") || "") || undefined,
      rfc: String(form.get("rfc") || "") || undefined,
      direccion: String(form.get("direccion") || "") || undefined,
      escolaridad: String(form.get("escolaridad") || "") || undefined,
      experiencia: String(form.get("experiencia") || "") || undefined,
      curriculum,
      cartaPresentacion,
      vacanteId: parseInt(String(form.get("vacanteId") || "0"), 10),
    };
    const parsed = candidatoSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: apiError(parsed.error.errors[0]?.message || "Datos inválidos") };
    }
    return { data: parsed.data };
  }

  const body = await request.json();
  const parsed = candidatoSchema.safeParse(body);
  if (!parsed.success) {
    return { error: apiError(parsed.error.errors[0]?.message || "Datos inválidos") };
  }
  return { data: parsed.data };
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseCandidatoBody(request);
  if ("error" in parsedBody && parsedBody.error) return parsedBody.error;
  const data = parsedBody.data!;

  const vacante = await prisma.vacante.findUnique({
    where: { id: data.vacanteId },
    include: { departamento: true },
  });

  if (!vacante) return apiError("Vacante no encontrada", 404);

  if (vacante.estado !== "ABIERTA" || vacante.cupoDisponible <= 0) {
    return apiError("No hay vacantes disponibles en este departamento", 403);
  }

  if (vacante.cupoDisponible - vacante.cupoBloqueado <= 0) {
    return apiError("Todos los cupos están temporalmente reservados", 409);
  }

  let candidato;
  try {
    candidato = await prisma.$transaction(async (tx) => {
      await tx.vacante.update({
        where: { id: vacante.id },
        data: { cupoBloqueado: { increment: 1 } },
      });

      return tx.candidato.create({
        data: { ...data, email: data.email.trim().toLowerCase() },
        include: { vacante: { include: { departamento: true } } },
      });
    });
  } catch (e) {
    return handlePrismaError(e);
  }

  await prisma.vacante.update({
    where: { id: vacante.id },
    data: {
      cupoBloqueado: { decrement: 1 },
      cupoDisponible: { decrement: 1 },
    },
  });

  const usuariosRH = await prisma.usuario.findMany({
    where: { rol: { nombre: { in: ["Recursos Humanos", "Administrador"] } } },
  });

  for (const u of usuariosRH) {
    await notificarUsuarioId(
      u.id,
      "Nuevo candidato registrado",
      `${data.nombre} ${data.apellidoPaterno} aplicó a ${vacante.titulo}`,
      "CONTRATACION"
    );
  }

  return apiSuccess(candidato, 201);
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("candidatos:read");
  if (error) return error;

  const vacanteId = request.nextUrl.searchParams.get("vacanteId");
  const etapa = request.nextUrl.searchParams.get("etapa");
  const pendientes = request.nextUrl.searchParams.get("pendientes") !== "0";

  const candidatos = await prisma.candidato.findMany({
    where: {
      ...(vacanteId ? { vacanteId: parseInt(vacanteId) } : {}),
      ...(etapa ? { etapa: etapa as never } : {}),
      ...(pendientes && !etapa
        ? { etapa: { notIn: ["CONTRATADO", "RECHAZADO"] } }
        : {}),
    },
    include: {
      vacante: { include: { departamento: { include: { organizacion: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(candidatos);
}
