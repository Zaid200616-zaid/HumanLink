import { apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function mapVacantePublica(v: {
  id: number;
  titulo: string;
  descripcion: string;
  requisitos: string | null;
  modalidad: string | null;
  tipoEmpleo: string | null;
  ubicacion: string | null;
  salario: string | null;
  cupoDisponible: number;
  fechaPublicacion: Date;
  departamentoId: number;
  departamento: {
    nombre: string;
    ubicacion: string | null;
    organizacion: { nombre: string };
  };
}) {
  return {
    id: v.id,
    titulo: v.titulo,
    descripcion: v.descripcion,
    requisitos: v.requisitos,
    departamento: v.departamento.nombre,
    departamentoId: v.departamentoId,
    organizacion: v.departamento.organizacion.nombre,
    modalidad: v.modalidad || "Presencial",
    tipoEmpleo: v.tipoEmpleo || "Tiempo completo",
    ubicacion:
      v.ubicacion ||
      v.departamento.ubicacion ||
      v.departamento.organizacion.nombre,
    salario: v.salario || "A convenir",
    cupoDisponible: v.cupoDisponible,
    fechaPublicacion: v.fechaPublicacion,
  };
}

// Vacantes abiertas para la bolsa pública
export async function GET() {
  const vacantes = await prisma.vacante.findMany({
    where: {
      estado: "ABIERTA",
      cupoDisponible: { gt: 0 },
    },
    include: {
      departamento: { include: { organizacion: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(vacantes.map(mapVacantePublica));
}
