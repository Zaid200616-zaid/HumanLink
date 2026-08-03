import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { getSession, hasPermission } from "@/lib/auth";
import { readFile } from "fs/promises";
import { uploadsPath } from "@/lib/uploads";
import path from "path";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const segments = (await params).path;
  if (!segments?.length) return apiError("Archivo no encontrado", 404);

  const subfolder = segments[0];
  const filename = segments.slice(1).join("/");
  if (!filename || filename.includes("..")) return apiError("Ruta inválida", 400);

  const session = await getSession();
  if (!session) return apiError("No autenticado", 401);

  const allowed = ["documents", "logos", "avatars", "curriculums", "cartas"];
  if (!allowed.includes(subfolder)) return apiError("No permitido", 403);

  if (subfolder === "curriculums" || subfolder === "cartas") {
    if (
      !hasPermission(session.permisos, "candidatos:read") &&
      !hasPermission(session.permisos, "candidatos:*")
    ) {
      return apiError("Sin permisos para ver archivos de candidatos", 403);
    }
  } else if (subfolder === "documents") {
    if (
      !hasPermission(session.permisos, "documentos:read") &&
      !hasPermission(session.permisos, "documentos:*")
    ) {
      return apiError("Sin permisos para ver documentos", 403);
    }
  }

  try {
    const filePath = uploadsPath(subfolder, filename);
    const data = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };
    return new Response(data, {
      headers: {
        "Content-Type": types[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return apiError("Archivo no encontrado", 404);
  }
}
