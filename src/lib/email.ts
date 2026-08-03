import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (process.env.SMTP_ENABLED !== "true") return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

export async function enviarEmail(destino: string, asunto: string, cuerpo: string) {
  let enviado = true;
  let detalle: string | null = null;

  const tx = getTransporter();
  if (tx) {
    try {
      await tx.sendMail({
        from: process.env.SMTP_FROM || "HumanLink <no-reply@humanlink.mx>",
        to: destino,
        subject: asunto,
        text: cuerpo,
        html: `<div style="font-family:sans-serif"><h2 style="color:#1B4F72">${asunto}</h2><p>${cuerpo.replace(/\n/g, "<br/>")}</p><hr/><small>HumanLink · SGRH</small></div>`,
      });
    } catch (e) {
      enviado = false;
      detalle = e instanceof Error ? e.message : "Error SMTP";
    }
  }

  await prisma.emailLog.create({
    data: { destino, asunto, cuerpo: detalle ? `${cuerpo}\n[ERROR: ${detalle}]` : cuerpo, enviado },
  });
  return { ok: enviado };
}

export async function notificarConEmail(
  usuarioId: number,
  email: string,
  titulo: string,
  mensaje: string,
  tipo: string
) {
  await prisma.notificacion.create({
    data: { usuarioId, titulo, mensaje, tipo },
  });
  await enviarEmail(email, titulo, mensaje);
}

export async function notificarUsuarioId(
  usuarioId: number,
  titulo: string,
  mensaje: string,
  tipo: string
) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { email: true },
  });
  if (!usuario) return;
  await notificarConEmail(usuarioId, usuario.email, titulo, mensaje, tipo);
}
