/** Días desde el registro (RNF-PQ01). */
export { diasDesde as diasDesdeRegistro, etiquetaRelativa } from "@/lib/format-date";

/** Etiqueta relativa a partir de días transcurridos (lista de quejas). */
export function etiquetaAntiguedad(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
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
