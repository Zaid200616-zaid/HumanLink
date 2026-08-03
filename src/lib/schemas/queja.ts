import { z } from "zod";
import { zRequiredString } from "@/lib/validation/fields";

export const ESTADOS_QUEJA = [
  { value: "REGISTRADA", label: "Pendiente" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "RESUELTA", label: "Resuelta" },
  { value: "CERRADA", label: "Cerrada" },
] as const;

export type EstadoQuejaValue = (typeof ESTADOS_QUEJA)[number]["value"];

export const estadoQuejaSchema = z.enum(
  ["REGISTRADA", "EN_REVISION", "EN_PROCESO", "RESUELTA", "CERRADA"],
  { errorMap: () => ({ message: "El estado seleccionado no es válido." }) }
);

export const quejaCreateSchema = z.object({
  asunto: zRequiredString("Asunto", 5, 200),
  descripcion: zRequiredString("Descripción", 20, 5000),
});

export const quejaPatchSchema = z.object({
  id: z.number().int().positive("Identificador de queja inválido."),
  estado: estadoQuejaSchema,
  seguimiento: z
    .string()
    .max(5000, "Las notas de seguimiento son demasiado largas.")
    .optional()
    .nullable(),
});

export function labelEstadoQueja(estado: string): string {
  return ESTADOS_QUEJA.find((e) => e.value === estado)?.label || estado;
}
