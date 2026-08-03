import { z } from "zod";

export const CURP_RE = /^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]{2}$/;
export const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
export const TELEFONO_RE = /^[\d\s+\-()]{7,20}$/;

export const zEmail = z
  .string({ required_error: "El correo electrónico es obligatorio." })
  .min(1, "El correo electrónico es obligatorio.")
  .email("El correo electrónico no es válido.");

export const zPassword = z
  .string({ required_error: "La contraseña es obligatoria." })
  .min(8, "La contraseña debe contener al menos 8 caracteres.");

export const zRequiredString = (label: string, min = 1, max = 500) =>
  z
    .string({ required_error: `El campo ${label} es obligatorio.` })
    .min(min, min > 1 ? `${label} debe tener al menos ${min} caracteres.` : `El campo ${label} es obligatorio.`)
    .max(max, `${label} no puede exceder ${max} caracteres.`);

export const zCurp = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .refine((v) => !v || CURP_RE.test(v), "La CURP no tiene un formato válido (18 caracteres).");

export const zRfc = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .refine((v) => !v || RFC_RE.test(v), "El RFC no tiene un formato válido.");

export const zTelefono = z
  .string()
  .optional()
  .refine((v) => !v || TELEFONO_RE.test(v), "El teléfono no es válido.");

export const zNumeroEmpleado = z
  .string({ required_error: "El número de empleado es obligatorio." })
  .min(1, "El número de empleado es obligatorio.")
  .max(32, "El número de empleado es demasiado largo.");

export const zFechaIngreso = z
  .string({ required_error: "La fecha de contratación es obligatoria." })
  .min(1, "La fecha de contratación es obligatoria.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "La fecha de contratación no es válida.")
  .refine((v) => new Date(v) <= new Date(), "La fecha de contratación no puede ser mayor a la fecha actual.");

export const zDepartamentoId = z
  .number({ required_error: "Debe seleccionar un departamento." })
  .int("Debe seleccionar un departamento.");

export const zTurnoId = z
  .number({ required_error: "Debe seleccionar un turno." })
  .int("Debe seleccionar un turno.");
