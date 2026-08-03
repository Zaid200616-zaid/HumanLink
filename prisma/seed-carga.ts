/**
 * RNF13 - Capacidad de Base de Datos (RF-H02 Gestión de Empleados)
 *
 * Genera una carga masiva de empleados sintéticos para probar que el sistema
 * mantiene un rendimiento estable con más de 10,000 registros.
 *
 * Uso:  npx tsx prisma/seed-carga.ts [cantidad]
 * Ej.:  npx tsx prisma/seed-carga.ts 10000
 *
 * Al terminar mide el tiempo de una consulta indexada (búsqueda por número de
 * empleado y por departamento) para comprobar el requisito de respuesta < 3s.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CANTIDAD = parseInt(process.argv[2] || "10000", 10);
const LOTE = 1000;

const NOMBRES = ["Juan", "María", "Luis", "Ana", "Carlos", "Sofía", "Jorge", "Laura", "Miguel", "Elena", "Pedro", "Diana"];
const APELLIDOS = ["García", "López", "Martínez", "Hernández", "González", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores"];
const PUESTOS = ["Analista", "Auxiliar", "Coordinador", "Especialista", "Técnico", "Ejecutivo", "Asistente"];

const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Cadenas con el formato correcto (18 CURP / 13 RFC) y únicas por índice
function curpDe(i: number) {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const base = Array.from({ length: 4 }, () => rand(letras.split(""))).join("");
  const seis = String(100000 + (i % 900000));
  const cola = Array.from({ length: 6 }, () => rand(letras.split(""))).join("");
  const homo = String(i % 100).padStart(2, "0");
  return `${base}${seis}${cola}${homo}`.slice(0, 18);
}
function rfcDe(i: number) {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const base = Array.from({ length: 4 }, () => rand(letras.split(""))).join("");
  const seis = String(100000 + (i % 900000));
  const homo = (i % 1000).toString(36).toUpperCase().padStart(3, "0");
  return `${base}${seis}${homo}`.slice(0, 13);
}

async function main() {
  console.log(`\n[RNF13] Generando ${CANTIDAD} empleados de prueba...`);

  const departamentos = await prisma.departamento.findMany({ select: { id: true } });
  const turnos = await prisma.turno.findMany({ select: { id: true } });
  if (departamentos.length === 0) {
    console.error("No hay departamentos. Ejecuta primero: npm run db:seed");
    return;
  }

  // Prefijo único para no chocar con datos existentes ni entre corridas
  const prefijo = `LT${Date.now().toString().slice(-6)}`;
  const tInsert = Date.now();

  for (let inicio = 0; inicio < CANTIDAD; inicio += LOTE) {
    const lote = [];
    for (let j = 0; j < LOTE && inicio + j < CANTIDAD; j++) {
      const i = inicio + j;
      lote.push({
        numeroEmpleado: `${prefijo}-${i}`,
        nombre: rand(NOMBRES),
        apellidoPaterno: rand(APELLIDOS),
        apellidoMaterno: rand(APELLIDOS),
        email: `${prefijo.toLowerCase()}.emp${i}@humanlink.test`,
        curp: `${curpDe(i)}${prefijo}${i}`.slice(0, 18),
        rfc: `${rfcDe(i)}`.slice(0, 10) + (prefijo.slice(0, 1) + (i % 100)).slice(0, 3),
        fechaIngreso: new Date(2018 + (i % 7), i % 12, (i % 27) + 1),
        puesto: rand(PUESTOS),
        departamentoId: rand(departamentos).id,
        turnoId: turnos.length ? rand(turnos).id : null,
        activo: i % 20 !== 0,
      });
    }
    await prisma.empleado.createMany({ data: lote });
    process.stdout.write(`\r  Insertados ${Math.min(inicio + LOTE, CANTIDAD)}/${CANTIDAD}`);
  }
  console.log(`\n  Inserción completada en ${((Date.now() - tInsert) / 1000).toFixed(2)}s`);

  const total = await prisma.empleado.count();
  console.log(`  Total de empleados en la base: ${total}`);

  // Prueba de rendimiento de consultas indexadas (RNF13 / RNF12)
  const t1 = Date.now();
  await prisma.empleado.findUnique({ where: { numeroEmpleado: `${prefijo}-500` } });
  console.log(`  Búsqueda por numeroEmpleado (índice único): ${Date.now() - t1}ms`);

  const t2 = Date.now();
  await prisma.empleado.findMany({
    where: { departamentoId: departamentos[0].id },
    take: 50,
  });
  console.log(`  Búsqueda por departamento (índice): ${Date.now() - t2}ms`);

  const t3 = Date.now();
  await prisma.empleado.findMany({
    where: { apellidoPaterno: { contains: "García" } },
    take: 50,
  });
  console.log(`  Búsqueda por apellido: ${Date.now() - t3}ms`);

  console.log("\n[RNF13] Prueba de capacidad finalizada.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
