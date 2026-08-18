import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const sol = await p.solicitudPermiso.findMany({
    include: { empleado: { select: { nombre: true, numeroEmpleado: true } } },
    orderBy: { id: "asc" },
  });
  console.log("SOLICITUDES");
  for (const s of sol) {
    console.log(
      `${s.id}|${s.empleado.numeroEmpleado}|${s.tipo}|${s.estado}|${s.diasSolicitados}|${s.motivo.slice(0, 50)}`
    );
  }
  const caps = await p.$queryRaw<
    { id: number; nombre: string; cupoMaximo: number; ins: bigint }[]
  >`SELECT c.id,c.nombre,c.cupoMaximo,COUNT(ce.id) ins FROM Capacitacion c LEFT JOIN CapacitacionEmpleado ce ON ce.capacitacionId=c.id GROUP BY c.id,c.nombre,c.cupoMaximo`;
  console.log("\nCAPS", caps);
  const emp = await p.empleado.findMany({
    select: { id: true, numeroEmpleado: true, nombre: true, fechaIngreso: true },
    orderBy: { id: "asc" },
  });
  console.log("\nEMP");
  for (const e of emp) console.log(`${e.id}|${e.numeroEmpleado}|${e.nombre}|${e.fechaIngreso.toISOString().slice(0, 10)}`);
  const cli = await p.calculoLaboralInfo.findMany();
  console.log("\nCLI", cli);
  const cand = await p.candidato.findMany({ include: { vacante: { select: { id: true, titulo: true } } } });
  console.log("\nCAND");
  for (const c of cand)
    console.log(`${c.id}|v${c.vacanteId}|${c.email}|${c.etapa}|${c.vacante.titulo}`);
}
main().finally(() => p.$disconnect());
