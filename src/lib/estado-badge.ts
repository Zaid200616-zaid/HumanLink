type BadgeVariant = "neutral" | "primary" | "success" | "danger" | "warning";

const LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  APROBADO: "Aprobado",
  RECHAZADA: "Rechazada",
  RECHAZADO: "Rechazado",
  CANCELADA: "Cancelada",
  CANCELADO: "Cancelado",
  ABIERTA: "Abierta",
  ABIERTO: "Abierto",
  CERRADA: "Cerrada",
  CERRADO: "Cerrado",
  RESUELTA: "Resuelta",
  EN_REVISION: "En revisión",
  EN_PROCESO: "En proceso",
  CONTRATADO: "Contratado",
  CONFIRMADO: "Confirmado",
  REGISTRADA: "Registrada",
  INSCRITO: "Inscrito",
  PUNTUAL: "Puntual",
  RETARDO: "Retardo",
  FALTA: "Falta",
  PERMISO: "Permiso",
  VACACION: "Vacación",
  VACACIONES: "Vacaciones",
  PROGRAMADA: "Programada",
  PUBLICADA: "Publicada",
  RECIBIDA: "Recibida",
  REVISION_CV: "Revisión CV",
  ENTREVISTA: "Entrevista",
  EVALUACION: "Evaluación",
  OFERTA: "Oferta",
  RECEPCION: "Postulación recibida",
};

const VARIANT_MAP: Record<string, BadgeVariant> = {
  ACTIVO: "success",
  INACTIVO: "neutral",
  PENDIENTE: "warning",
  APROBADA: "success",
  APROBADO: "success",
  RECHAZADA: "danger",
  RECHAZADO: "danger",
  CONFIRMADO: "success",
  REGISTRADA: "warning",
  INSCRITO: "primary",
  CANCELADA: "neutral",
  CANCELADO: "neutral",
  ABIERTA: "primary",
  ABIERTO: "primary",
  CERRADA: "success",
  CERRADO: "success",
  RESUELTA: "success",
  EN_REVISION: "warning",
  EN_PROCESO: "warning",
  CONTRATADO: "success",
  PUNTUAL: "success",
  RETARDO: "warning",
  FALTA: "danger",
  PERMISO: "primary",
  VACACION: "neutral",
  VACACIONES: "neutral",
  PROGRAMADA: "primary",
  PUBLICADA: "primary",
  RECIBIDA: "primary",
  REVISION_CV: "warning",
  ENTREVISTA: "warning",
  EVALUACION: "warning",
  OFERTA: "primary",
  RECEPCION: "primary",
};

function normalizeEstado(estado: string): string {
  return estado.trim().toUpperCase().replace(/\s+/g, "_");
}

export function resolveEstadoBadge(estado: string): { variant: BadgeVariant; label: string } {
  const key = normalizeEstado(estado);
  return {
    variant: VARIANT_MAP[key] ?? "neutral",
    label: LABELS[key] ?? estado,
  };
}

/** @deprecated Usar resolveEstadoBadge */
export function variantSolicitud(estado: string): BadgeVariant {
  return resolveEstadoBadge(estado).variant;
}

/** @deprecated Usar resolveEstadoBadge */
export function variantQueja(estado: string): BadgeVariant {
  return resolveEstadoBadge(estado).variant;
}

/** @deprecated Usar resolveEstadoBadge */
export function variantCandidato(etapa: string): BadgeVariant {
  return resolveEstadoBadge(etapa).variant;
}
