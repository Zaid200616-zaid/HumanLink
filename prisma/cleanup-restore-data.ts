/**
 * Limpieza de textos de prueba, restauración de saldos de vacaciones
 * y recálculo de CalculoLaboralInfo (sin tocar triggers ni schema).
 *
 * Uso: npx tsx prisma/cleanup-restore-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PREFIX = "[Demo Entrega 2026]";

const MOTIVO_RENAMES: Record<number, string> = {
  14: "Solicitud de vacaciones por asuntos personales (revisión interna)",
  15: "Solicitud de vacaciones extendida — no procede por saldo disponible",
  20: "Vacaciones familiares en noviembre — saldo suficiente",
  21: "Periodo vacacional extendido de septiembre a octubre",
  22: "Descanso personal de fin de semana largo",
  23: "Permiso para trámite escolar de dependiente",
  24: "Vacaciones en periodo de alta demanda operativa",
};

const TEST_SOLICITUD_IDS_REVERT = [14]; // APROBADA solo por prueba de trigger
const TEST_SOLICITUD_IDS_DELETE = [17]; // 145 días — registro inválido de prueba

async function countTables() {
  const tables = [
    "Empleado", "Vacante", "Candidato", "Capacitacion", "CapacitacionEmpleado",
    "Asistencia", "SolicitudPermiso", "EvaluacionDesempeno", "QuejaLaboral",
    "EventoOrganizacional", "Documento",
  ];
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const r = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT COUNT(*) AS c FROM \`${t}\``
    );
    counts[t] = Number(r[0]?.c ?? 0);
  }
  return counts;
}

function stripPrefix(text: string | null): string | null {
  if (!text) return text;
  let t = text;
  while (t.includes(PREFIX)) t = t.replace(PREFIX, "").trim();
  t = t.replace(/\s{2,}/g, " ").trim();
  if (t.startsWith("]")) t = t.slice(1).trim();
  return t;
}

async function cleanTextColumns() {
  const updates: { table: string; id: number; col: string; before: string; after: string }[] = [];

  const caps = await prisma.capacitacion.findMany();
  for (const c of caps) {
    const nombre = stripPrefix(c.nombre) ?? c.nombre;
    const descripcion = stripPrefix(c.descripcion) ?? c.descripcion;
    if (nombre !== c.nombre || descripcion !== c.descripcion) {
      await prisma.capacitacion.update({
        where: { id: c.id },
        data: {
          nombre,
          descripcion:
            descripcion === "Programa corporativo de desarrollo profesional."
              ? "Programa corporativo de desarrollo profesional orientado al puesto."
              : descripcion,
        },
      });
      updates.push({ table: "Capacitacion", id: c.id, col: "nombre", before: c.nombre, after: nombre });
    }
    if (c.nombre === "Tics") {
      await prisma.capacitacion.update({
        where: { id: c.id },
        data: { nombre: "Fundamentos de tecnologías de información" },
      });
    }
  }

  const vacs = await prisma.vacante.findMany();
  for (const v of vacs) {
    const titulo = stripPrefix(v.titulo) ?? v.titulo;
    if (titulo !== v.titulo) {
      await prisma.vacante.update({ where: { id: v.id }, data: { titulo } });
      updates.push({ table: "Vacante", id: v.id, col: "titulo", before: v.titulo, after: titulo });
    }
  }

  const evs = await prisma.eventoOrganizacional.findMany();
  for (const e of evs) {
    const titulo = stripPrefix(e.titulo) ?? e.titulo;
    if (titulo !== e.titulo) {
      await prisma.eventoOrganizacional.update({ where: { id: e.id }, data: { titulo } });
      updates.push({ table: "EventoOrganizacional", id: e.id, col: "titulo", before: e.titulo, after: titulo });
    }
  }

  const evals = await prisma.evaluacionDesempeno.findMany();
  for (const ev of evals) {
    if (ev.comentarios?.includes(PREFIX) || ev.comentarios?.includes("Evaluación de desempeño registrada conforme")) {
      const comentarios = ev.comentarios
        ?.replace(PREFIX, "")
        .replace(
          "Evaluación de desempeño registrada conforme a objetivos del periodo.",
          "Desempeño alineado a objetivos del periodo; se reconoce cumplimiento y áreas de mejora."
        )
        .trim();
      await prisma.evaluacionDesempeno.update({
        where: { id: ev.id },
        data: { comentarios: comentarios || ev.comentarios },
      });
    }
  }

  for (const [idStr, motivo] of Object.entries(MOTIVO_RENAMES)) {
    const id = parseInt(idStr);
    const s = await prisma.solicitudPermiso.findUnique({ where: { id } });
    if (s && s.motivo !== motivo) {
      await prisma.solicitudPermiso.update({ where: { id }, data: { motivo } });
      updates.push({ table: "SolicitudPermiso", id, col: "motivo", before: s.motivo.slice(0, 60), after: motivo.slice(0, 60) });
    }
  }

  const s14 = await prisma.solicitudPermiso.findUnique({ where: { id: 14 } });
  if (s14?.respuesta?.includes("prueba") || s14?.respuesta?.includes("Revertido")) {
    await prisma.solicitudPermiso.update({
      where: { id: 14 },
      data: { respuesta: "No procede conforme a la política de vacaciones del periodo solicitado." },
    });
  }

  return updates;
}

async function revertTestSolicitudes() {
  const report: string[] = [];
  for (const id of TEST_SOLICITUD_IDS_REVERT) {
    const s = await prisma.solicitudPermiso.findUnique({
      where: { id },
      include: { empleado: { select: { numeroEmpleado: true, nombre: true } } },
    });
    if (!s) continue;
    if (s.estado === "APROBADA") {
      await prisma.solicitudPermiso.update({
        where: { id },
        data: {
          estado: "RECHAZADA",
          respuesta: "No procede conforme a la política de vacaciones del periodo solicitado.",
          fechaResolucion: new Date(),
        },
      });
      report.push(
        `Revertida solicitud #${id} (${s.empleado.numeroEmpleado}): APROBADA → RECHAZADA (${s.diasSolicitados} días)`
      );
    }
  }
  for (const id of TEST_SOLICITUD_IDS_DELETE) {
    const s = await prisma.solicitudPermiso.findUnique({ where: { id } });
    if (s) {
      await prisma.solicitudPermiso.delete({ where: { id } });
      report.push(`Eliminada solicitud #${id} (${s.diasSolicitados} días ${s.tipo}) — registro inválido de prueba`);
    }
  }
  return report;
}

/** Recalcula CalculoLaboralInfo según LFT + extra − vacaciones APROBADAS (sin usar triggers). */
async function recalcularSaldosVacaciones() {
  const empleados = await prisma.empleado.findMany({ where: { activo: true } });
  const report: { empleadoId: number; numero: string; antes: number | null; despues: number }[] = [];

  for (const e of empleados) {
    const antesRow = await prisma.calculoLaboralInfo.findUnique({
      where: { empleadoId: e.id },
    });
    const antes = antesRow?.diasVacaciones ?? null;

    const rows = await prisma.$queryRaw<
      { saldo: number | bigint }[]
    >`
      SELECT GREATEST(
        fn_dias_vacaciones_lft(DATE(${e.fechaIngreso})) + IFNULL(${e.diasVacacionesExtra}, 0)
        - IFNULL((
            SELECT SUM(diasSolicitados) FROM SolicitudPermiso
             WHERE empleadoId = ${e.id} AND tipo = 'VACACION' AND estado = 'APROBADA'
          ), 0),
        0
      ) AS saldo
    `;
    const saldo = Number(rows[0]?.saldo ?? 0);

    await prisma.$executeRaw`
      INSERT INTO CalculoLaboralInfo (empleadoId, diasVacaciones, primaVacacionalPct, aguinaldoDias, notas, updatedAt)
      VALUES (
        ${e.id},
        ${saldo},
        25,
        15,
        ${`Saldo recalculado conforme a vacaciones aprobadas · ${saldo} día(s) disponibles`},
        NOW(3)
      )
      ON DUPLICATE KEY UPDATE
        diasVacaciones = ${saldo},
        notas = ${`Saldo recalculado conforme a vacaciones aprobadas · ${saldo} día(s) disponibles`},
        updatedAt = NOW(3)
    `;

    if (antes !== saldo) {
      report.push({
        empleadoId: e.id,
        numero: e.numeroEmpleado,
        antes,
        despues: saldo,
      });
    }
  }
  return report;
}

async function main() {
  console.log("=== HumanLink — Limpieza y restauración de datos ===\n");
  const before = await countTables();
  console.log("Conteos ANTES:", before);

  console.log("\n--- Revirtiendo solicitudes de prueba ---");
  const revertLog = await revertTestSolicitudes();
  revertLog.forEach((l) => console.log(" ", l));

  console.log("\n--- Limpiando textos Demo/Test ---");
  const renames = await cleanTextColumns();
  console.log(`  ${renames.length} campos renombrados`);

  console.log("\n--- Recalculando saldos de vacaciones ---");
  const saldos = await recalcularSaldosVacaciones();
  for (const s of saldos) {
    console.log(
      `  ${s.numero} (id=${s.empleadoId}): ${s.antes ?? "—"} → ${s.despues} días`
    );
  }

  const after = await countTables();
  console.log("\nConteos DESPUÉS:", after);

  console.log("\n--- Escenarios preparados (sin ejecutar) ---");
  const capFull = await prisma.$queryRaw<
    { id: number; nombre: string; cupoMaximo: number; ins: bigint }[]
  >`
    SELECT c.id, c.nombre, c.cupoMaximo, COUNT(ce.id) AS ins
      FROM Capacitacion c
      JOIN CapacitacionEmpleado ce ON ce.capacitacionId = c.id
     GROUP BY c.id, c.nombre, c.cupoMaximo
    HAVING ins >= c.cupoMaximo
     LIMIT 3
  `;
  capFull.forEach((c) =>
    console.log(`  Capacitación llena: id=${c.id} "${c.nombre}" (${c.ins}/${c.cupoMaximo})`)
  );

  const solInsuf = await prisma.solicitudPermiso.findFirst({
    where: { id: 21, estado: "PENDIENTE", tipo: "VACACION" },
  });
  const solSuf = await prisma.solicitudPermiso.findFirst({
    where: { id: 22, estado: "PENDIENTE", tipo: "VACACION" },
  });
  console.log(
    `  Vacaciones sin saldo: solicitud #${solInsuf?.id} (${solInsuf?.diasSolicitados} días PENDIENTE)`
  );
  console.log(
    `  Vacaciones con saldo: solicitud #${solSuf?.id} (${solSuf?.diasSolicitados} días PENDIENTE)`
  );

  console.log("\n✅ Limpieza completada.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
