import { NextResponse } from "next/server";
import { getSession, hasPermission } from "./auth";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
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
