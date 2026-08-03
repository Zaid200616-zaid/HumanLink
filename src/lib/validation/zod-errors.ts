import type { ZodError } from "zod";

/** Convierte ZodError en mapa campo → mensaje específico (RNF-A04). */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function firstZodError(error: ZodError): string {
  return error.issues[0]?.message || "Revise los campos marcados.";
}
