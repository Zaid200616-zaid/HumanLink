/** RNF-PQ02 — Mensaje al intentar editar una queja cerrada */
export const MSG_BLOQUEO_QUEJA_CERRADA =
  "Se ha bloqueado la edición para evitar cambios no autorizados en las resoluciones finales de las quejas.";

/** Estado Cerrada: no admite modificaciones */
export function quejaEstaCerrada(estado: string): boolean {
  return estado === "CERRADA";
}

/** Resuelta o cerrada (solo lectura visual / antigüedad) */
export function quejaResolucionFinal(estado: string): boolean {
  return estado === "RESUELTA" || estado === "CERRADA";
}
