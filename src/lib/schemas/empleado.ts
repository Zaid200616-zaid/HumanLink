import { z } from "zod";
import {
  zCurp,
  zEmail,
  zFechaIngreso,
  zNumeroEmpleado,
  zRequiredString,
  zRfc,
  zTelefono,
} from "@/lib/validation/fields";

export const empleadoCreateSchema = z.object({
  numeroEmpleado: zNumeroEmpleado,
  nombre: zRequiredString("Nombre", 2),
  apellidoPaterno: zRequiredString("Apellido paterno", 2),
  apellidoMaterno: z.string().optional(),
  email: zEmail,
  curp: zCurp.optional(),
  rfc: zRfc.optional(),
  telefono: zTelefono,
  fechaIngreso: zFechaIngreso,
  puesto: zRequiredString("Puesto", 2),
  departamentoId: z.number().int().nullable().optional(),
  turnoId: z.number().int().nullable().optional(),
  salario: z.number().optional(),
});

export const empleadoUpdateSchema = empleadoCreateSchema.partial();

export function mensajeDuplicadoEmpleado(
  duplicado: { numeroEmpleado: string; email: string; curp: string | null; rfc: string | null },
  data: { numeroEmpleado: string; email: string; curp?: string; rfc?: string }
): string {
  if (duplicado.numeroEmpleado === data.numeroEmpleado) return "El número de empleado ya existe.";
  if (duplicado.email === data.email) return "El correo electrónico ya se encuentra registrado.";
  if (data.curp && duplicado.curp === data.curp) return "La CURP ya se encuentra registrada.";
  if (data.rfc && duplicado.rfc === data.rfc) return "El RFC ya se encuentra registrado.";
  return "Ya existe un empleado con esos datos.";
}
