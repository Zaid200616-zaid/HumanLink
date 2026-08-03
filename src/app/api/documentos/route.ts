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

const includeDoc = {
  empleado: { select: { id: true, nombre: true, apellidoPaterno: true, numeroEmpleado: true } },
};

// RF-H18
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth("documentos:read");
  if (error || !session) return error;

  const empleadoId = request.nextUrl.searchParams.get("empleadoId");
  const where: { empleadoId?: number } = {};
  if (empleadoId) where.empleadoId = parseInt(empleadoId);

  if (session.rol === "Empleado" && session.empleadoId) {
    where.empleadoId = session.empleadoId;
  }

  const docs = await prisma.documento.findMany({
    where,
    include: includeDoc,
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(docs);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("documentos:write");
  if (error) return error;

  const form = await request.formData();
  const empleadoId = parseInt(String(form.get("empleadoId") || ""));
  const tipo = String(form.get("tipo") || "");
  const nombre = String(form.get("nombre") || "").trim();
  const observaciones = String(form.get("observaciones") || "").trim() || undefined;
  const activo = form.get("activo") !== "false";
  const archivo = form.get("archivo");

  if (!empleadoId || !nombre) return apiError("Empleado y nombre son obligatorios");
  if (!TIPOS_DOCUMENTO.includes(tipo as (typeof TIPOS_DOCUMENTO)[number])) {
    return apiError("Tipo de documento no válido");
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return apiError("Debe adjuntar un archivo PDF, JPG o PNG");
  }
  if (archivo.size > MAX_BYTES_DOCUMENTO) {
    return apiError("El archivo supera el tamaño máximo de 5 MB");
  }
  if (!extensionPermitida(archivo.name)) {
    return apiError("Formato no permitido. Use PDF, JPG o PNG");
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const rutaArchivo = await guardarArchivo("documents", archivo.name, buffer);

  const doc = await prisma.documento.create({
    data: {
      empleadoId,
      tipo,
      nombre,
      rutaArchivo,
      observaciones,
      activo,
    },
    include: includeDoc,
  });

  return apiSuccess(doc, 201);
}
