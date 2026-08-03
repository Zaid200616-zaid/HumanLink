import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { guardarArchivo } from "@/lib/uploads";
import {
  TIPOS_DOCUMENTO,
  extensionPermitida,
  MAX_BYTES_DOCUMENTO,
} from "@/lib/documentos";

type Params = { params: Promise<{ id: string }> };

const includeDoc = {
  empleado: { select: { id: true, nombre: true, apellidoPaterno: true, numeroEmpleado: true } },
};

const updateJsonSchema = z.object({
  tipo: z.string().optional(),
  nombre: z.string().min(1).optional(),
  observaciones: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth("documentos:read");
  if (error || !session) return error;

  const id = parseInt((await params).id);
  const doc = await prisma.documento.findUnique({
    where: { id },
    include: includeDoc,
  });
  if (!doc) return apiError("Documento no encontrado", 404);

  if (session.rol === "Empleado" && session.empleadoId !== doc.empleadoId) {
    return apiError("Sin permisos", 403);
  }

  return apiSuccess(doc);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth("documentos:write");
  if (error) return error;

  const id = parseInt((await params).id);
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const tipo = form.get("tipo") ? String(form.get("tipo")) : undefined;
    const nombre = form.get("nombre") ? String(form.get("nombre")).trim() : undefined;
    const observaciones = form.has("observaciones")
      ? String(form.get("observaciones") || "").trim() || null
      : undefined;
    const activo = form.has("activo") ? form.get("activo") !== "false" : undefined;
    const archivo = form.get("archivo");

    const data: Record<string, unknown> = {};
    if (tipo) {
      if (!TIPOS_DOCUMENTO.includes(tipo as (typeof TIPOS_DOCUMENTO)[number])) {
        return apiError("Tipo de documento no válido");
      }
      data.tipo = tipo;
    }
    if (nombre) data.nombre = nombre;
    if (observaciones !== undefined) data.observaciones = observaciones;
    if (activo !== undefined) data.activo = activo;

    if (archivo instanceof File && archivo.size > 0) {
      if (archivo.size > MAX_BYTES_DOCUMENTO) return apiError("Archivo demasiado grande (máx. 5 MB)");
      if (!extensionPermitida(archivo.name)) return apiError("Formato no permitido");
      const buffer = Buffer.from(await archivo.arrayBuffer());
      data.rutaArchivo = await guardarArchivo("documents", archivo.name, buffer);
    }

    const doc = await prisma.documento.update({
      where: { id },
      data,
      include: includeDoc,
    });
    return apiSuccess(doc);
  }

  const body = await request.json();
  const parsed = updateJsonSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");
  if (parsed.data.tipo && !TIPOS_DOCUMENTO.includes(parsed.data.tipo as (typeof TIPOS_DOCUMENTO)[number])) {
    return apiError("Tipo de documento no válido");
  }

  const doc = await prisma.documento.update({
    where: { id },
    data: parsed.data,
    include: includeDoc,
  });
  return apiSuccess(doc);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth("documentos:write");
  if (error) return error;

  const id = parseInt((await params).id);
  await prisma.documento.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
