import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { enviarEmail, notificarUsuarioId } from "@/lib/email";
import { CONTRASENA_TEMPORAL_EMPLEADO } from "@/lib/roles";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type AccesoContratado = {
  email: string;
  passwordTemporal: string;
  usuarioId: number;
  empleadoId: number;
  turnoId: number;
  creado: boolean;
};

type CandidatoContrato = {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  email: string;
  telefono: string | null;
  vacante: {
    titulo: string;
    departamentoId: number;
  };
};

async function resolverTurnoId(turnoId?: number): Promise<number> {
  if (turnoId) {
    const turno = await prisma.turno.findFirst({ where: { id: turnoId, activo: true } });
    if (!turno) throw new Error("El turno seleccionado no existe o está inactivo.");
    return turno.id;
  }
  const turnoDefault = await prisma.turno.findFirst({
    where: { activo: true },
    orderBy: { id: "asc" },
  });
  if (!turnoDefault) {
    throw new Error("No hay turnos laborales configurados. Cree un turno antes de contratar.");
  }
  return turnoDefault.id;
}

/**
 * Garantiza empleado + usuario + turno al marcar CONTRATADO (RF-H04 / RF-H06).
 */
export async function provisionarAccesoContratado(
  candidato: CandidatoContrato,
  turnoId?: number
): Promise<AccesoContratado> {
  const email = normalizeEmail(candidato.email);
  const rolEmpleado = await prisma.rol.findUnique({ where: { nombre: "Empleado" } });
  if (!rolEmpleado) {
    throw new Error("No está configurado el rol Empleado en el sistema");
  }

  const resolvedTurnoId = await resolverTurnoId(turnoId);
  const tempPass = CONTRASENA_TEMPORAL_EMPLEADO;
  const passwordHash = await hashPassword(tempPass);

  const result = await prisma.$transaction(async (tx) => {
    let empleado = await tx.empleado.findUnique({ where: { email } });

    if (!empleado) {
      empleado = await tx.empleado.create({
        data: {
          numeroEmpleado: `HL-${Date.now().toString().slice(-6)}`,
          nombre: candidato.nombre,
          apellidoPaterno: candidato.apellidoPaterno,
          apellidoMaterno: candidato.apellidoMaterno,
          email,
          telefono: candidato.telefono,
          fechaIngreso: new Date(),
          puesto: candidato.vacante.titulo,
          departamentoId: candidato.vacante.departamentoId,
          turnoId: resolvedTurnoId,
        },
      });

      const tareasDefault = [
        "Firmar políticas de la empresa",
        "Entregar documentación de identificación",
        "Configurar acceso al sistema",
        "Capacitación de inducción",
      ];
      for (const t of tareasDefault) {
        await tx.onboardingTareaEmpleado.create({
          data: { empleadoId: empleado.id, tarea: t },
        });
      }
    } else if (!empleado.turnoId) {
      empleado = await tx.empleado.update({
        where: { id: empleado.id },
        data: { turnoId: resolvedTurnoId },
      });
    }

    let usuario = await tx.usuario.findUnique({ where: { email } });
    let creado = false;

    if (!usuario) {
      usuario = await tx.usuario.create({
        data: {
          email,
          passwordHash,
          rolId: rolEmpleado.id,
          activo: true,
        },
      });
      creado = true;
    } else {
      usuario = await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          passwordHash,
          rolId: rolEmpleado.id,
          activo: true,
          intentosFallidos: 0,
          bloqueadoHasta: null,
        },
      });
    }

    if (empleado.usuarioId !== usuario.id) {
      empleado = await tx.empleado.update({
        where: { id: empleado.id },
        data: { usuarioId: usuario.id },
      });
    }

    return { empleado, usuario, creado };
  });

  const mensajeNotif = `Tu cuenta fue activada. Correo: ${email}. Contraseña temporal: ${tempPass} (cámbiala en Mi Perfil después de ingresar).`;

  await notificarUsuarioId(result.usuario.id, "Bienvenido a HumanLink", mensajeNotif, "SISTEMA");

  await enviarEmail(
    email,
    "Acceso a HumanLink — contraseña temporal",
    `Hola ${candidato.nombre},\n\nTu contratación fue registrada.\n\nCorreo: ${email}\nContraseña temporal: ${tempPass}\n\nIngresa en el portal de HumanLink y cambia tu contraseña en Mi Perfil.\n\nHumanLink · Recursos Humanos`
  );

  return {
    email,
    passwordTemporal: tempPass,
    usuarioId: result.usuario.id,
    empleadoId: result.empleado.id,
    turnoId: resolvedTurnoId,
    creado: result.creado,
  };
}
