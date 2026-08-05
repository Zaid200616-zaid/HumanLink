const LOCALE = "es-MX";

/** Fecha y hora completas (tablas, detalle). */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(LOCALE);
}

/** Solo fecha (calendarios, rangos). */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE);
}

/** Días transcurridos desde una fecha. */
export function diasDesde(value: string | Date): number {
  const start = new Date(value);
  const now = new Date();
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** Etiqueta relativa unificada: Hoy, Ayer, Hace N días. */
export function etiquetaRelativa(value: string | Date): string {
  const dias = diasDesde(value);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 14) return "Hace 1 semana";
  const semanas = Math.floor(dias / 7);
  if (dias < 30) return `Hace ${semanas} semanas`;
  const meses = Math.floor(dias / 30);
  if (meses === 1) return "Hace 1 mes";
  return `Hace ${meses} meses`;
}
