import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { sincronizarAsistenciasSolicitud } from "@/lib/asistencias-sync";
import { notificarUsuarioId } from "@/lib/email";
import { requiereSupervisor } from "@/lib/workflows";
import {
  calcularDiasHabiles,
  construirExpedienteVacaciones,
  haySolapamiento,
} from "@/lib/vacaciones";

async function notificarSupervisor(empleadoId: number, mensaje: string) {
  const emp = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: { departamento: true },
  });
  if (!emp?.departamento?.supervisorId) return;
  const sup = await prisma.empleado.findUnique({
    where: { id: emp.departamento.supervisorId },
    include: { usuario: true },
  });
  if (sup?.usuario) {
    await notificarUsuarioId(
      sup.usuario.id,
      "Solicitud pendiente de tu equipo",
      mensaje,
      "SOLICITUD"
    );
  }
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const estado = request.nextUrl.searchParams.get("estado");
  const vista = request.nextUrl.searchParams.get("vista");

  let where: Record<string, unknown> = {};
  if (estado) where.estado = estado;

  if (session!.rol === "Empleado" && session!.empleadoId) {
    where.empleadoId = session!.empleadoId;
  } else if (session!.rol === "Supervisor" && session!.empleadoId && vista === "equipo") {
    const depts = await prisma.departamento.findMany({
      where: { supervisorId: session!.empleadoId },
      select: { id: true },
    });
    where.empleado = { departamentoId: { in: depts.map((d) => d.id) } };
    where.aprobacionSupervisor = "PENDIENTE";
    where.estado = "PENDIENTE";
  }

  const solicitudes = await prisma.solicitudPermiso.findMany({
    where,
    include: {
      empleado: {
        include: { departamento: { include: { organizacion: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(solicitudes);
}

const solicitudSchema = z.object({
  tipo: z.enum(["PERMISO", "VACACION"]),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  motivo: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth("solicitudes:write");
  if (error) return error;
  if (!session!.empleadoId) return apiError("Usuario sin empleado asociado", 400);

  const body = await request.json();
  const parsed = solicitudSchema.safeParse(body);
  if (!parsed.success) return apiError("Datos inválidos");

  const fechaInicio = new Date(parsed.data.fechaInicio);
  const fechaFin = new Date(parsed.data.fechaFin);
  if (fechaFin < fechaInicio) return apiError("La fecha fin debe ser posterior a la fecha inicio");

  const diasSolicitados = calcularDiasHabiles(fechaInicio, fechaFin);
  if (diasSolicitados === 0) return apiError("El rango debe incluir al menos un día hábil");

  const empleado = await prisma.empleado.findUnique({
    where: { id: session!.empleadoId },
    include: { departamento: { include: { organizacion: true } } },
  });
  if (!empleado) return apiError("Empleado no encontrado", 404);

  const org = empleado.departamento?.organizacion;
  if (org && diasSolicitados > org.maxDiasConsecutivosVacacion && parsed.data.tipo === "VACACION") {
    return apiError(`Máximo ${org.maxDiasConsecutivosVacacion} días consecutivos según política`);
  }

  const diasAntes = org?.diasAnticipacionVacacion ?? 7;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = (fechaInicio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  if (parsed.data.tipo === "VACACION" && diff < diasAntes) {
    return apiError(`Solicita con al menos ${diasAntes} días de anticipación`);
  }

  const existentes = await prisma.solicitudPermiso.findMany({
    where: { empleadoId: session!.empleadoId },
  });
  if (haySolapamiento(existentes, fechaInicio, fechaFin)) {
    return apiError("Ya existe una solicitud en esas fechas");
  }

  if (parsed.data.tipo === "VACACION") {
    const exp = construirExpedienteVacaciones(empleado, existentes);
    if (exp.diasDisponibles < diasSolicitados) {
      return apiError(`Saldo insuficiente: ${exp.diasDisponibles} días disponibles`);
    }
  }

  const tieneSupervisorDepto = Boolean(
    empleado.departamento?.supervisorId &&
    empleado.departamento.supervisorId !== session!.empleadoId
  );
  const tieneSupervisor = await requiereSupervisor("SOLICITUDES", tieneSupervisorDepto);

  const solicitud = await prisma.solicitudPermiso.create({
    data: {
      empleadoId: session!.empleadoId,
      tipo: parsed.data.tipo,
      fechaInicio,
      fechaFin,
      diasSolicitados,
      motivo: parsed.data.motivo,
      aprobacionSupervisor: tieneSupervisor ? "PENDIENTE" : "NO_APLICA",
    },
    include: { empleado: true },
  });

  if (tieneSupervisor) {
    await notificarSupervisor(
      session!.empleadoId,
      `${solicitud.empleado.nombre} solicitó ${parsed.data.tipo.toLowerCase()} (${diasSolicitados} días)`
    );
  } else {
    const usuariosRH = await prisma.usuario.findMany({
      where: { rol: { nombre: { in: ["Recursos Humanos", "Administrador"] } } },
    });
    for (const u of usuariosRH) {
      await notificarUsuarioId(
        u.id,
        "Nueva solicitud de permiso",
        `${solicitud.empleado.nombre} solicitó ${parsed.data.tipo.toLowerCase()} (${diasSolicitados} días)`,
        "SOLICITUD"
      );
    }
  }

  await registrarAuditoria(session!.userId, session!.email, "CREAR", "solicitudes", `Solicitud ${solicitud.id}`);
  return apiSuccess(solicitud, 201);
}

export async function PATCH(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { id, estado, respuesta, accion } = body;
  if (!id) return apiError("id requerido");

  const solicitudActual = await prisma.solicitudPermiso.findUnique({
    where: { id: parseInt(id) },
    include: {
      empleado: {
        include: { departamento: true, usuario: true },
      },
    },
  });
  if (!solicitudActual) return apiError("Solicitud no encontrada", 404);
  if (solicitudActual.estado !== "PENDIENTE") return apiError("Esta solicitud ya fue resuelta");

  // Aprobación supervisor
  if (accion === "supervisor") {
    if (!session!.empleadoId) return apiError("Sin permisos de supervisor", 403);
    const supId = solicitudActual.empleado.departamento?.supervisorId;
    if (supId !== session!.empleadoId) return apiError("No supervisas a este empleado", 403);
    if (!estado) return apiError("estado requerido");

    const supEstado = estado === "APROBADA" ? "APROBADO" : "RECHAZADO";
    const respSup = respuesta?.trim() || (supEstado === "APROBADO" ? "Aprobado por supervisor" : "Rechazado por supervisor");

    const solicitud = await prisma.solicitudPermiso.update({
      where: { id: parseInt(id) },
      data: {
        aprobacionSupervisor: supEstado,
        supervisorRespuesta: respSup,
        supervisorAprobadoPorId: session!.empleadoId,
        supervisorFechaResolucion: new Date(),
        ...(supEstado === "RECHAZADO" && { estado: "RECHAZADA", respuesta: respSup, fechaResolucion: new Date() }),
      },
      include: { empleado: true },
    });

    if (supEstado === "APROBADO") {
      const usuariosRH = await prisma.usuario.findMany({
        where: { rol: { nombre: { in: ["Recursos Humanos", "Administrador"] } } },
      });
      for (const u of usuariosRH) {
        await notificarUsuarioId(
          u.id,
          "Solicitud aprobada por supervisor",
          `${solicitud.empleado.nombre}: pendiente confirmación RH`,
          "SOLICITUD"
        );
      }
    } else if (solicitudActual.empleado.usuario) {
      await notificarUsuarioId(
        solicitudActual.empleado.usuario.id,
        "Solicitud rechazada",
        respSup,
        "SOLICITUD"
      );
    }

    await registrarAuditoria(session!.userId, session!.email, "SUPERVISOR", "solicitudes", `ID ${id} → ${supEstado}`);
    return apiSuccess(solicitud);
  }

  // Aprobación RH
  const { error: rhError } = await requireAuth("solicitudes:*");
  if (rhError) return rhError;
  if (!estado) return apiError("estado requerido");

  if (
    solicitudActual.aprobacionSupervisor === "PENDIENTE" ||
    solicitudActual.aprobacionSupervisor === "RECHAZADO"
  ) {
    if (solicitudActual.aprobacionSupervisor === "PENDIENTE") {
      return apiError("Pendiente de aprobación del supervisor");
    }
    return apiError("Rechazada por el supervisor");
  }

  if (estado === "APROBADA" && solicitudActual.tipo === "VACACION") {
    const todas = await prisma.solicitudPermiso.findMany({
      where: { empleadoId: solicitudActual.empleadoId },
    });
    const exp = construirExpedienteVacaciones(
      solicitudActual.empleado,
      todas,
      solicitudActual.id
    );
    if (!exp.puedeAutorizar) {
      return apiError(`Saldo insuficiente: ${exp.diasDisponibles} días disponibles`);
    }
  }

  const respuestaFinal =
    respuesta?.trim() ||
    (estado === "APROBADA" ? "Aprobada por Recursos Humanos" : "Rechazada por Recursos Humanos");

  const solicitud = await prisma.solicitudPermiso.update({
    where: { id: parseInt(id) },
    data: {
      estado,
      respuesta: respuestaFinal,
      aprobadoPorId: session!.empleadoId ?? undefined,
      fechaResolucion: new Date(),
    },
    include: { empleado: true },
  });

  if (estado === "APROBADA") {
    await sincronizarAsistenciasSolicitud(
      solicitudActual.empleadoId,
      solicitudActual.fechaInicio,
      solicitudActual.fechaFin,
      solicitudActual.tipo
    );
  }

  if (solicitudActual.empleado.usuario) {
    await notificarUsuarioId(
      solicitudActual.empleado.usuario.id,
      estado === "APROBADA" ? "Solicitud aprobada" : "Solicitud rechazada",
      respuestaFinal,
      "SOLICITUD"
    );
  }

  await registrarAuditoria(session!.userId, session!.email, estado, "solicitudes", `ID ${id}`);
  return apiSuccess(solicitud);
}
