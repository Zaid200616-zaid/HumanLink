/**
 * Auditoría de base de datos HumanLink (solo lectura).
 * Uso: npx tsx prisma/audit-db.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TABLES = [
  "Rol",
  "Usuario",
  "Organizacion",
  "Departamento",
  "Turno",
  "Empleado",
  "Vacante",
  "Candidato",
  "Capacitacion",
  "CapacitacionEmpleado",
  "Asistencia",
  "SolicitudPermiso",
  "EvaluacionDesempeno",
  "QuejaLaboral",
  "QuejaHistorial",
  "EventoOrganizacional",
  "EventoRespuesta",
  "Documento",
  "HistorialReporte",
  "Notificacion",
  "CalculoLaboralInfo",
] as const;

async function main() {
  console.log("=== HumanLink — Auditoría MySQL (solo lectura) ===\n");

  const version = await prisma.$queryRaw<{ version: string }[]>`SELECT VERSION() AS version`;
  const db = await prisma.$queryRaw<{ db: string }[]>`SELECT DATABASE() AS db`;
  console.log("Versión:", version[0]?.version);
  console.log("Base de datos:", db[0]?.db);

  const tables = await prisma.$queryRaw<{ Tables_in_humanlink: string }[]>`
    SHOW TABLES
  `;
  console.log("\nTablas:", tables.length);

  const triggers = await prisma.$queryRaw<
    { Trigger: string; Event: string; Table: string }[]
  >`SHOW TRIGGERS FROM humanlink`;
  console.log("\nTriggers instalados:", triggers.length);
  for (const t of triggers) {
    console.log(`  - ${t.Trigger} (${t.Event} ${t.Table})`);
  }

  const procs = await prisma.$queryRaw<{ Name: string }[]>`
    SHOW PROCEDURE STATUS WHERE Db = 'humanlink'
  `;
  console.log("\nProcedimientos:", procs.length);
  for (const p of procs) console.log(`  - ${p.Name}`);

  const views = await prisma.$queryRaw<{ Tables_in_humanlink: string; Table_type: string }[]>`
    SHOW FULL TABLES FROM humanlink WHERE Table_type = 'VIEW'
  `;
  console.log("\nVistas:", views.length);
  for (const v of views) console.log(`  - ${v.Tables_in_humanlink}`);

  console.log("\n--- Conteos por tabla ---");
  for (const table of TABLES) {
    try {
      const result = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT COUNT(*) AS c FROM \`${table}\``
      );
      console.log(`  ${table.padEnd(24)} ${result[0]?.c ?? 0}`);
    } catch {
      console.log(`  ${table.padEnd(24)} (no existe)`);
    }
  }

  console.log("\n--- Escenarios demo (si existen) ---");

  const capLlena = await prisma.$queryRaw<
    { id: number; nombre: string; cupoMaximo: number; inscritos: bigint }[]
  >`
    SELECT c.id, c.nombre, c.cupoMaximo, COUNT(ce.id) AS inscritos
      FROM Capacitacion c
      LEFT JOIN CapacitacionEmpleado ce ON ce.capacitacionId = c.id
     GROUP BY c.id, c.nombre, c.cupoMaximo
    HAVING inscritos = c.cupoMaximo
     LIMIT 5
  `;
  console.log("\nCapacitaciones llenas:", capLlena.length);
  capLlena.forEach((c) =>
    console.log(`  id=${c.id} ${c.nombre} cupo=${c.cupoMaximo}`)
  );

  const solPend = await prisma.solicitudPermiso.findMany({
    where: { tipo: "VACACION", estado: "PENDIENTE" },
    include: { empleado: { select: { id: true, nombre: true, email: true } } },
    take: 10,
  });
  console.log("\nSolicitudes VACACION PENDIENTE:", solPend.length);
  for (const s of solPend) {
    console.log(
      `  id=${s.id} emp=${s.empleadoId} (${s.empleado.nombre}) dias=${s.diasSolicitados} motivo=${s.motivo.slice(0, 50)}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
