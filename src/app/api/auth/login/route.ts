import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, verifyPassword, COOKIE_NAME, parsePermisos } from "@/lib/auth";
import { enVentanaTurno, mensajeFueraDeTurno, rolExentoHorarioLaboral } from "@/lib/acceso-turno";
import crypto from "crypto";

const loginSchema = z.object({
  email: z.string().email("El correo electrónico no es válido."),
  password: z.string().min(1, "El campo Contraseña es obligatorio."),
});

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

function clientInfo(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

async function completarLogin(
  usuario: {
    id: number;
    email: string;
    rol: { nombre: string; permisos: string };
    empleado: { id: number } | null;
  },
  request: NextRequest
) {
  const permisos = parsePermisos(usuario.rol.permisos);
  const token = await createToken({
    userId: usuario.id,
    email: usuario.email,
    rol: usuario.rol.nombre,
    permisos,
    empleadoId: usuario.empleado?.id,
  });

  const { ip, userAgent } = clientInfo(request);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await prisma.sesionUsuario.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      ip,
      userAgent,
      expiresAt,
    },
  });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });

  const response = NextResponse.json({
    user: {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      empleadoId: usuario.empleado?.id,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Datos inválidos";
      return NextResponse.json({ error: msg, field: parsed.error.errors[0]?.path[0] }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const emailNorm = email.trim().toLowerCase();

    const usuario = await prisma.usuario.findUnique({
      where: { email: emailNorm },
      include: {
        rol: true,
        empleado: { include: { turno: true } },
      },
    });

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      const restanteMs = usuario.bloqueadoHasta.getTime() - Date.now();
      const minutos = Math.ceil(restanteMs / 60000);
      return NextResponse.json(
        {
          error: "Cuenta bloqueada temporalmente",
          bloqueo: {
            motivo: "Múltiples intentos fallidos de inicio de sesión",
            minutosRestantes: minutos,
            mensaje: `Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en ${minutos} minuto(s) o contacta al administrador.`,
            recomendaciones: [
              "Verifica que tu contraseña sea correcta",
              "Usa la opción «¿Olvidaste tu contraseña?» si la necesitas",
              "Contacta al administrador si el problema continúa",
            ],
          },
        },
        { status: 423 }
      );
    }

    const valid = await verifyPassword(password, usuario.passwordHash);
    if (!valid) {
      const intentos = usuario.intentosFallidos + 1;
      const data: { intentosFallidos: number; bloqueadoHasta?: Date } = { intentosFallidos: intentos };
      if (intentos >= MAX_INTENTOS) {
        data.bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
      }
      await prisma.usuario.update({ where: { id: usuario.id }, data });
      if (intentos >= MAX_INTENTOS) {
        return NextResponse.json(
          {
            error: "Cuenta bloqueada temporalmente",
            bloqueo: {
              motivo: "Múltiples intentos fallidos de inicio de sesión",
              minutosRestantes: MINUTOS_BLOQUEO,
              mensaje: `Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en ${MINUTOS_BLOQUEO} minutos o contacta al administrador.`,
              recomendaciones: [
                "Espera el tiempo indicado antes de volver a intentar",
                "Contacta al administrador para desbloqueo anticipado",
              ],
            },
          },
          { status: 423 }
        );
      }
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!rolExentoHorarioLaboral(usuario.rol.nombre) && usuario.empleado?.turno) {
      if (!enVentanaTurno(usuario.empleado.turno)) {
        return NextResponse.json({ error: mensajeFueraDeTurno() }, { status: 403 });
      }
    }

    return completarLogin(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        empleado: usuario.empleado ? { id: usuario.empleado.id } : null,
      },
      request
    );
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.sesionUsuario.updateMany({
      where: { tokenHash: hash, activa: true },
      data: { activa: false },
    });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
