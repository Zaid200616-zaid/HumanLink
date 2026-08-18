import { Prisma } from "@prisma/client";

/** Mensajes SIGNAL conocidos → trigger que los emite (solo lectura, no modifica SQL). */
export const TRIGGER_BY_MESSAGE: Record<string, string> = {
  "La capacitación ya no cuenta con lugares disponibles.": "trg_capacitacion_valida_cupo",
  "La capacitación indicada no existe.": "trg_capacitacion_valida_cupo",
  "El candidato ya cuenta con una postulación activa para esa vacante.":
    "trg_candidato_postulacion_unica",
  "Saldo insuficiente de vacaciones para aprobar la solicitud.":
    "trg_solicitud_validar_saldo_vacaciones",
};

export type ParsedMysqlError = {
  message: string;
  source: "database";
  mysqlCode?: string;
  trigger?: string;
};

const TRIGGER_BY_FRAGMENT: Array<{ fragment: string; trigger: string }> = [
  { fragment: "lugares disponibles", trigger: "trg_capacitacion_valida_cupo" },
  { fragment: "capacitación indicada no existe", trigger: "trg_capacitacion_valida_cupo" },
  { fragment: "capacitaci", trigger: "trg_capacitacion_valida_cupo" },
  { fragment: "postulaci", trigger: "trg_candidato_postulacion_unica" },
  { fragment: "Saldo insuficiente de vacaciones", trigger: "trg_solicitud_validar_saldo_vacaciones" },
];

function inferTrigger(message: string): string | undefined {
  if (TRIGGER_BY_MESSAGE[message]) return TRIGGER_BY_MESSAGE[message];
  const lower = message.toLowerCase();
  for (const { fragment, trigger } of TRIGGER_BY_FRAGMENT) {
    if (lower.includes(fragment.toLowerCase())) return trigger;
  }
  return undefined;
}

/** Texto legible del SIGNAL (texto oficial del trigger; corrige mojibake en consola Windows). */
function toDisplayMessage(raw: string): string {
  const trigger = inferTrigger(raw);
  if (!trigger) return raw;
  if (trigger === "trg_capacitacion_valida_cupo") {
    if (raw.includes("no existe")) return "La capacitación indicada no existe.";
    return "La capacitación ya no cuenta con lugares disponibles.";
  }
  if (trigger === "trg_candidato_postulacion_unica") {
    return "El candidato ya cuenta con una postulación activa para esa vacante.";
  }
  if (trigger === "trg_solicitud_validar_saldo_vacaciones") {
    return "Saldo insuficiente de vacaciones para aprobar la solicitud.";
  }
  return raw;
}

function extractMysqlMessage(raw: string): string | null {
  if (!raw) return null;

  const connector = raw.match(/message:\s*"([^"]+)"/i);
  if (connector?.[1]) return connector[1].trim();

  const backtick = raw.match(/Message:\s*`([^`]+)`/i);
  if (backtick?.[1]) return backtick[1].trim();

  for (const known of Object.keys(TRIGGER_BY_MESSAGE)) {
    if (raw.includes(known)) return known;
  }

  for (const { fragment } of TRIGGER_BY_FRAGMENT) {
    if (raw.toLowerCase().includes(fragment.toLowerCase())) {
      const connectorPartial = raw.match(/message:\s*"([^"]+)"/i);
      if (connectorPartial?.[1]) return connectorPartial[1].trim();
    }
  }

  return null;
}

/** Extrae el mensaje real de MySQL cuando Prisma propaga un SIGNAL SQLSTATE 45000. */
export function parseMysqlError(error: unknown): ParsedMysqlError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as { code?: string; message?: string } | undefined;
    const fromMeta = extractMysqlMessage(meta?.message ?? "");
    const fromError = extractMysqlMessage(error.message);
    const rawMessage = fromMeta ?? fromError;
    if (!rawMessage) return null;
    return {
      message: toDisplayMessage(rawMessage),
      source: "database",
      mysqlCode: meta?.code,
      trigger: inferTrigger(rawMessage),
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const rawMessage = extractMysqlMessage(error.message);
    if (!rawMessage) return null;
    return {
      message: toDisplayMessage(rawMessage),
      source: "database",
      trigger: inferTrigger(rawMessage),
    };
  }

  if (error instanceof Error) {
    const rawMessage = extractMysqlMessage(error.message);
    if (!rawMessage) return null;
    return {
      message: toDisplayMessage(rawMessage),
      source: "database",
      trigger: inferTrigger(rawMessage),
    };
  }

  return null;
}
