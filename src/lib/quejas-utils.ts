/** Días desde el registro (RNF-PQ01). */
export function diasDesdeRegistro(createdAt: string | Date): number {
  const start = new Date(createdAt);
  const now = new Date();
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function etiquetaAntiguedad(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Hace 1 día";
  return `Hace ${dias} días`;
}

/** Intensidad única (gama primary): crítico ≥15, medio 7–14, claro <7 */
export type NivelAntiguedad = "claro" | "medio" | "critico" | "cerrada";

export function nivelAntiguedad(dias: number, estado: string): NivelAntiguedad {
  if (estado === "RESUELTA" || estado === "CERRADA") return "cerrada";
  if (dias >= 15) return "critico";
  if (dias >= 7) return "medio";
  return "claro";
}

export const ANTIGUEDAD_ROW_CLASS: Record<NivelAntiguedad, string> = {
  claro: "hl-age-claro",
  medio: "hl-age-medio",
  critico: "hl-age-critico",
  cerrada: "hl-age-cerrada",
};
