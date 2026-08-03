import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "humanlink-dev-secret"
);

export const COOKIE_NAME = "humanlink_session";

export interface SessionPayload {
  userId: number;
  email: string;
  rol: string;
  permisos: string[];
  empleadoId?: number;
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
