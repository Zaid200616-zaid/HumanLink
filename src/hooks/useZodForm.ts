"use client";

import { useCallback, useState } from "react";
import type { ZodSchema } from "zod";
import { zodFieldErrors } from "@/lib/validation/zod-errors";

export type FieldState = "idle" | "valid" | "invalid";

export function useZodForm<T extends Record<string, unknown>>(schema: ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback(
    (data: unknown): data is T => {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        setErrors(zodFieldErrors(parsed.error));
        return false;
      }
      setErrors({});
      return true;
    },
    [schema]
  );

  const validateField = useCallback(
    (name: string, data: unknown) => {
      const parsed = schema.safeParse(data);
      if (parsed.success) {
        setErrors((e) => {
          const next = { ...e };
          delete next[name];
          return next;
        });
        return true;
      }
      const fe = zodFieldErrors(parsed.error);
      setErrors((e) => ({ ...e, ...(fe[name] ? { [name]: fe[name] } : {}) }));
      return false;
    },
    [schema]
  );

  const touch = useCallback((name: string) => {
    setTouched((t) => ({ ...t, [name]: true }));
  }, []);

  const fieldState = useCallback(
    (name: string, value: unknown): FieldState => {
      if (errors[name]) return "invalid";
      if (touched[name] && value !== "" && value !== undefined && value !== null) {
        const parsed = schema.safeParse({ [name]: value });
        if (parsed.success) return "valid";
      }
      return "idle";
    },
    [errors, touched, schema]
  );

  const clear = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return { errors, touched, validate, validateField, touch, fieldState, setErrors, clear };
}
