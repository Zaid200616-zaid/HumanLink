/**
 * Reinicia días disponibles de vacaciones para todos los empleados activos:
 * 1) Elimina solicitudes de tipo VACACION (libera pendientes y aprobadas).
 * 2) Recalcula CalculoLaboralInfo = LFT(fechaIngreso) + diasVacacionesExtra.
 *
 * No modifica PERMISO ni triggers/schema.
 *
 * Uso: npm run db:reset-vacaciones
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function recalcularSaldoEmpleado(empleadoId: number, fechaIngreso: Date, diasExtra: number) {
  const rows = await prisma.$queryRaw<{ saldo: number | bigint }[]>`
    SELECT GREATEST(
      fn_dias_vacaciones_lft(DATE(${fechaIngreso})) + IFNULL(${diasExtra}, 0),
      0
    ) AS saldo
  `;
  const saldo = Number(rows[0]?.saldo ?? 0);

  await prisma.$executeRaw`
    INSERT INTO CalculoLaboralInfo (empleadoId, diasVacaciones, primaVacacionalPct, aguinaldoDias, notas, updatedAt)
    VALUES (
      ${empleadoId},
      ${saldo},
      25,
      15,
      ${`Saldo reiniciado · ${saldo} día(s) disponibles`},
      NOW(3)
    )
    ON DUPLICATE KEY UPDATE
      diasVacaciones = ${saldo},
      notas = ${`Saldo reiniciado · ${saldo} día(s) disponibles`},
      updatedAt = NOW(3)
  `;

  return saldo;
}

async function main() {
  console.log("=== HumanLink — Reinicio de vacaciones ===\n");

  const eliminadas = await prisma.solicitudPermiso.deleteMany({
    where: { tipo: "VACACION" },
  });
  console.log(`Solicitudes VACACION eliminadas: ${eliminadas.count}`);

  const empleados = await prisma.empleado.findMany({
    where: { activo: true },
    select: {
      id: true,
      numeroEmpleado: true,
      nombre: true,
      apellidoPaterno: true,
      fechaIngreso: true,
      diasVacacionesExtra: true,
    },
    orderBy: { numeroEmpleado: "asc" },
  });

  console.log(`\nRecalculando saldo para ${empleados.length} empleado(s) activo(s):\n`);

  for (const e of empleados) {
    const saldo = await recalcularSaldoEmpleado(e.id, e.fechaIngreso, e.diasVacacionesExtra);
    console.log(
      `  ${e.numeroEmpleado} · ${e.nombre} ${e.apellidoPaterno}: ${saldo} días` +
        (e.diasVacacionesExtra > 0 ? ` (incl. +${e.diasVacacionesExtra} extra)` : "")
    );
  }

  console.log("\n✅ Reinicio completado. Los permisos (PERMISO) no se modificaron.");
  console.log("   Para días adicionales por empleado: UPDATE Empleado SET diasVacacionesExtra = N WHERE ...");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
