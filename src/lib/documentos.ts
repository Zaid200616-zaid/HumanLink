/** RF-H18 — Tipos de documento laboral permitidos */
export const TIPOS_DOCUMENTO = [
  "Contrato laboral",
  "Identificación oficial",
  "CURP",
  "Acta de nacimiento",
  "Comprobante de domicilio",
  "Certificados",
  "Constancias",
  "Otros documentos laborales",
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const EXTENSIONES_DOCUMENTO = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export const MAX_BYTES_DOCUMENTO = 5 * 1024 * 1024; // 5 MB

export function extensionPermitida(nombre: string): boolean {
  const lower = nombre.toLowerCase();
  return EXTENSIONES_DOCUMENTO.some((ext) => lower.endsWith(ext));
}
