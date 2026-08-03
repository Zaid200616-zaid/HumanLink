import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;
  if (!email) return apiError("email requerido");

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return apiSuccess({ ok: true, mensaje: "Si el email existe, se enviará un enlace de recuperación" });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.tokenRecuperacion.create({
    data: { email, token, expiresAt },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const enlace = `${appUrl}/recuperar?token=${token}`;
  await enviarEmail(
    email,
    "Recuperación de contraseña · HumanLink",
    `Solicitaste restablecer tu contraseña.\n\nAbre este enlace (válido 1 hora):\n${enlace}\n\nSi no fuiste tú, ignora este correo.`
  );

  const smtpActivo = process.env.SMTP_ENABLED === "true";
  return apiSuccess({
    ok: true,
    mensaje: smtpActivo
      ? "Enviamos un enlace de recuperación a tu correo"
      : "Token generado (SMTP desactivado: usa el token mostrado)",
    ...(smtpActivo ? {} : { tokenDemo: token }),
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { token, password } = body;
  if (!token || !password || password.length < 8) {
    return apiError("token y contraseña (min 8) requeridos");
  }

  const rec = await prisma.tokenRecuperacion.findUnique({ where: { token } });
  if (!rec || rec.usado || rec.expiresAt < new Date()) {
    return apiError("Token inválido o expirado", 400);
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: rec.email } });
  if (!usuario) return apiError("Usuario no encontrado", 404);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashPassword(password) },
  });
  await prisma.tokenRecuperacion.update({ where: { id: rec.id }, data: { usado: true } });

  return apiSuccess({ ok: true });
}
