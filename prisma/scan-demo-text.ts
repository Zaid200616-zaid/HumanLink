/**
 * Escaneo de textos Demo/Test/Prueba en la BD (solo lectura).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PATTERNS = [
  "Demo",
  "DEMO",
  "demo",
  "[Demo Entrega 2026]",
  "Prueba",
  "Test",
  "Testing",
  "Demo Python",
  "Trigger Demo",
  "Usuario Demo",
  "Empleado Demo",
  "trigger test",
  "demostración académica",
];

const TEXT_TABLES: { table: string; cols: string[] }[] = [
  { table: "Capacitacion", cols: ["nombre", "descripcion", "instructor"] },
  { table: "Vacante", cols: ["titulo", "descripcion", "requisitos"] },
  { table: "SolicitudPermiso", cols: ["motivo", "respuesta", "supervisorRespuesta"] },
  { table: "CalculoLaboralInfo", cols: ["notas"] },
  { table: "Candidato", cols: ["nombre", "apellidoPaterno", "email"] },
  { table: "QuejaLaboral", cols: ["asunto", "descripcion"] },
  { table: "EventoOrganizacional", cols: ["titulo", "descripcion", "ubicacion"] },
  { table: "Documento", cols: ["nombre", "tipo", "observaciones"] },
  { table: "EvaluacionDesempeno", cols: ["comentarios", "periodo"] },
  { table: "Notificacion", cols: ["titulo", "mensaje"] },
  { table: "Empleado", cols: ["nombre", "email", "puesto"] },
  { table: "Comunicado", cols: ["titulo", "contenido"] },
];

async function main() {
  console.log("=== Escaneo Demo/Test/Prueba ===\n");
  for (const { table, cols } of TEXT_TABLES) {
    for (const col of cols) {
      for (const pat of PATTERNS) {
        try {
          const rows = await prisma.$queryRawUnsafe<
            { id: number; val: string }[]
          >(
            `SELECT id, \`${col}\` AS val FROM \`${table}\` WHERE \`${col}\` LIKE ?`,
            `%${pat}%`
          );
          for (const r of rows) {
            console.log(`${table}|${r.id}|${col}|${r.val?.slice(0, 120)}`);
          }
        } catch {
          /* columna inexistente */
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
