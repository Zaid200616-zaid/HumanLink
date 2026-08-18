import { NextResponse } from "next/server";
import { getSession, hasPermission } from "./auth";
import { parseMysqlError } from "./mysql-error";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiDatabaseError(message: string, trigger?: string, status = 409) {
  return NextResponse.json({ error: message, source: "database", trigger }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Convierte excepciones Prisma/MySQL en respuesta API segura para el frontend. */
export function handlePrismaError(error: unknown, fallback = "No fue posible completar la operación") {
  const db = parseMysqlError(error);
  if (db) return apiDatabaseError(db.message, db.trigger, 409);
  if (error instanceof Error && error.message && !error.message.includes("DATABASE_URL")) {
    return apiError(error.message, 500);
  }
  return apiError(fallback, 500);
}

export async function requireAuth(permission?: string) {
  const session = await getSession();
  if (!session) {
    return { error: apiError("No autenticado", 401), session: null };
  }
  if (permission && !hasPermission(session.permisos, permission)) {
    return { error: apiError("Sin permisos", 403), session: null };
  }
  return { error: null, session };
}
