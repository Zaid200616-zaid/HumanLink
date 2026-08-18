/**
 * Verificación post-carga: vistas, consultas avanzadas, índices.
 * Uso: npx tsx prisma/verify-database.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const VISTAS = [
  "VistaQuejas",
  "VistaEventos",
  "VistaCapacitaciones",
  "VistaVacantesAbiertas",
  "VistaAsistencias",
];

async function countView(name: string) {
  const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
    `SELECT COUNT(*) AS c FROM \`${name}\``
  );
  return Number(rows[0]?.c ?? 0);
}

function loadQueries(): { id: string; sql: string }[] {
  const raw = readFileSync(join(process.cwd(), "database", "advanced_queries.sql"), "utf8");
  const text = raw.replace(/^USE humanlink;\s*/m, "").replace(/\r\n/g, "\n");
  const out: { id: string; sql: string }[] = [];
  const re =
    /-- Q(\d+) · ([^\n]+)\n(?:--[^\n]*\n)*-- =+\n([\s\S]*?)(?=\n-- =+\n-- Q|\n-- =+\n-- FIN)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sql = m[3].trim().split(";")[0].trim();
    out.push({ id: `Q${m[1]}`, sql });
  }
  return out;
}

async function main() {
  console.log("=== Verificación post-carga HumanLink ===\n");

  console.log("--- Vistas ---");
  for (const v of VISTAS) {
    try {
      const c = await countView(v);
      console.log(`  ${v}: ${c} filas${c === 0 ? " ⚠ VACÍA" : ""}`);
    } catch (e) {
      console.log(`  ${v}: ERROR`, e instanceof Error ? e.message : e);
    }
  }

  console.log("\n--- Consultas Q1–Q12 ---");
  const queries = loadQueries();
  for (const q of queries) {
    try {
      const rows = await prisma.$queryRawUnsafe(q.sql);
      const n = Array.isArray(rows) ? rows.length : 0;
      console.log(`  ${q.id}: ${n} filas`);
    } catch (e) {
      console.log(`  ${q.id}: ERROR`, e instanceof Error ? e.message : e);
    }
  }

  console.log("\n--- Índices (muestra) ---");
  for (const t of ["Empleado", "Candidato", "CapacitacionEmpleado", "SolicitudPermiso", "Asistencia"]) {
    const idx = await prisma.$queryRawUnsafe(`SHOW INDEX FROM \`${t}\``);
    console.log(`  ${t}: ${Array.isArray(idx) ? idx.length : 0} entradas`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
