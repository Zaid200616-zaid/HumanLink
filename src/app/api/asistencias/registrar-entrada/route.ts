import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  calcularEstadoEntrada,
  horaActualHHMM,
  inicioDelDia,
  validarVentanaRegistro,
} from "@/lib/asistencia-registro";

export async function POST() {
  const { error, session } = await requireAuth("asistencias:read");
  if (error || !session) return error;

  if (!session.empleadoId) {
    return apiError("Tu usuario no está vinculado a un empleado. Contacta a Recursos Humanos.", 403);
  }

  const empleado = await prisma.empleado.findUnique({
    where: { id: session.empleadoId },
    include: { turno: true },
  });

  if (!empleado?.activo) {
    return apiError("No se puede registrar asistencia para un empleado inactivo.", 403);
  }

  if (!empleado.turno) {
    return apiError("No tienes un turno asignado. Solicita a Recursos Humanos que configure tu horario.", 409);
  }

  const ventana = validarVentanaRegistro(empleado.turno);
  if (!ventana.ok) return apiError(ventana.message, 403);

  const hoy = inicioDelDia();

  const existente = await prisma.asistencia.findUnique({
    where: {
      empleadoId_fecha: { empleadoId: empleado.id, fecha: hoy },
    },
  });

  if (existente) {
    return apiError("Ya registraste tu asistencia el día de hoy.", 409);
  }

  const horaEntrada = horaActualHHMM();
  const estado = calcularEstadoEntrada(empleado.turno.horaInicio, horaEntrada);

  const asistencia = await prisma.asistencia.create({
    data: {
      empleadoId: empleado.id,
      fecha: hoy,
      horaEntrada,
      estado,
      turnoNombre: empleado.turno.nombre,
      notas: "Registro automático de entrada",
    },
    include: {
      empleado: { include: { departamento: true, turno: true } },
    },
  });

  return apiSuccess(asistencia, 201);
}
