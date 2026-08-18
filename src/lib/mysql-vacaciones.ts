import { prisma } from "./prisma";

export type SaldoVacacionesSp = {
  empleadoId: number;
  diasAnualesLFT: number;
  diasExtra: number;
  diasTotales: number;
  saldoDisponible: number;
  saldoPersistidoBD: number | null;
};

type RawCallRow = Record<string, bigint | number | null | undefined>;

function toNum(value: bigint | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

/** Prisma/MySQL a veces devuelve columnas del CALL como f0, f1, … en lugar de alias. */
function parseSaldoSpRow(row: RawCallRow): SaldoVacacionesSp {
  if (row.empleadoId != null || row.diasAnualesLFT != null) {
    return {
      empleadoId: toNum(row.empleadoId),
      diasAnualesLFT: toNum(row.diasAnualesLFT),
      diasExtra: toNum(row.diasExtra),
      diasTotales: toNum(row.diasTotales),
      saldoDisponible: toNum(row.saldoDisponible),
      saldoPersistidoBD: row.saldoPersistidoBD == null ? null : toNum(row.saldoPersistidoBD),
    };
  }

  return {
    empleadoId: toNum(row.f0),
    diasAnualesLFT: toNum(row.f1),
    diasExtra: toNum(row.f2),
    diasTotales: toNum(row.f3),
    saldoDisponible: toNum(row.f4),
    saldoPersistidoBD: row.f5 == null ? null : toNum(row.f5),
  };
}

function parseFilasActualizadas(row: RawCallRow | undefined): number {
  if (!row) return 0;
  if (row.filasActualizadas != null) return toNum(row.filasActualizadas);
  if (row.f0 != null) return toNum(row.f0);
  return 0;
}

/** Ejecuta el SP real en MySQL (solo lectura). */
export async function consultarSaldoVacacionesSp(
  empleadoId: number
): Promise<SaldoVacacionesSp | null> {
  const rows = await prisma.$queryRaw<RawCallRow[]>`
    CALL sp_consultar_saldo_vacaciones(${empleadoId})
  `;
  const row = rows[0];
  if (!row) return null;
  return parseSaldoSpRow(row);
}

/**
 * Aprueba vacaciones vía procedimiento almacenado.
 * Dispara en MySQL: UPDATE → trg_solicitud_validar_saldo_vacaciones → trg_solicitud_descontar_vacaciones
 */
export async function aprobarVacacionesSp(
  solicitudId: number,
  aprobadoPorId: number | null,
  respuesta: string
): Promise<number> {
  const rows = await prisma.$queryRaw<RawCallRow[]>`
    CALL sp_aprobar_vacaciones(${solicitudId}, ${aprobadoPorId}, ${respuesta})
  `;
  return parseFilasActualizadas(rows[0]);
}
