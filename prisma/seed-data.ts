/**
 * HumanLink — Carga ADITIVA de datos empresariales (idempotente).
 *
 * NO borra datos. NO usar prisma/seed.ts (contiene deleteMany).
 *
 * Uso: npm run db:seed-data
 */
import {
  PrismaClient,
  EstadoAsistencia,
  EstadoVacante,
  EtapaContratacion,
} from "@prisma/client";

const prisma = new PrismaClient();

async function upsertEmpleado(data: {
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  email: string;
  fechaIngreso: Date;
  puesto: string;
  departamentoId: number;
  turnoId: number;
  diasVacacionesExtra?: number;
  salario?: number;
}) {
  return prisma.empleado.upsert({
    where: { numeroEmpleado: data.numeroEmpleado },
    create: { ...data, activo: true, salario: data.salario ?? 24000 },
    update: {
      nombre: data.nombre,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      email: data.email,
      fechaIngreso: data.fechaIngreso,
      puesto: data.puesto,
      departamentoId: data.departamentoId,
      turnoId: data.turnoId,
      diasVacacionesExtra: data.diasVacacionesExtra ?? 0,
      activo: true,
    },
  });
}

async function main() {
  console.log("🌱 HumanLink — carga aditiva de datos empresariales\n");

  const dept = await prisma.departamento.findMany({
    include: { organizacion: { select: { nombre: true } } },
  });
  const deptId = (org: string, nombre: string) =>
    dept.find((x) => x.organizacion.nombre === org && x.nombre === nombre)!.id;

  const turnos = await prisma.turno.findMany();
  const tMat = turnos.find((t) => t.nombre === "Matutino")!.id;
  const tVesp = turnos.find((t) => t.nombre === "Vespertino")!.id;
  const tNoc = turnos.find((t) => t.nombre === "Nocturno")!.id;

  const dTI = deptId("HumanLink S.A. de C.V.", "Tecnologías de la Información");
  const dRH = deptId("HumanLink S.A. de C.V.", "Recursos Humanos");
  const dOps = deptId("HumanLink S.A. de C.V.", "Operaciones");
  const dVen = deptId("HumanLink S.A. de C.V.", "Ventas y Marketing");
  const dAt = deptId("HumanLink S.A. de C.V.", "Atención al Cliente");
  const dRec = deptId("HumanLink Pacífico", "Reclutamiento");
  const dFin = deptId("HumanLink S.A. de C.V.", "Finanzas y Contabilidad");
  const dLog = deptId("HumanLink Norte", "Logística");

  const nuevos = [
    { n: "HLK-E401", nombre: "Mariana", ap: "Torres", email: "mariana.torres@humanlink.mx", fi: "2025-03-01", puesto: "Analista de Datos", d: dTI, t: tMat },
    { n: "HLK-E402", nombre: "Eduardo", ap: "Castillo", email: "eduardo.castillo@humanlink.mx", fi: "2024-08-12", puesto: "Especialista de Soporte TI", d: dTI, t: tMat },
    { n: "HLK-E403", nombre: "Fernanda", ap: "Ramírez", email: "fernanda.ramirez@humanlink.mx", fi: "2023-05-20", puesto: "Coordinadora de Recursos Humanos", d: dRH, t: tMat },
    { n: "HLK-E404", nombre: "Carlos", ap: "Mendoza", email: "carlos.mendoza@humanlink.mx", fi: "2022-02-14", puesto: "Ejecutivo de Reclutamiento", d: dRec, t: tVesp },
    { n: "HLK-E405", nombre: "Laura", ap: "Vega", email: "laura.vega@humanlink.mx", fi: "2021-09-01", puesto: "Supervisor de Operaciones", d: dOps, t: tMat },
    { n: "HLK-E406", nombre: "Ricardo", ap: "Navarro", email: "ricardo.navarro@humanlink.mx", fi: "2020-11-15", puesto: "Analista Financiero", d: dFin, t: tMat },
    { n: "HLK-E407", nombre: "Alejandra", ap: "Ponce", email: "alejandra.ponce@humanlink.mx", fi: "2019-04-22", puesto: "Coordinadora Logística", d: dLog, t: tVesp },
    { n: "HLK-E408", nombre: "Oscar", ap: "Benítez", email: "oscar.benitez@humanlink.mx", fi: "2018-07-10", puesto: "Agente Senior de Atención", d: dAt, t: tNoc },
    { n: "HLK-E409", nombre: "Paola", ap: "Cervantes", email: "paola.cervantes@humanlink.mx", fi: "2025-06-18", puesto: "Auxiliar de Recursos Humanos", d: dRH, t: tMat },
    { n: "HLK-E410", nombre: "Diego", ap: "Montoya", email: "diego.montoya@humanlink.mx", fi: "2024-01-08", puesto: "Desarrollador Full Stack", d: dTI, t: tMat },
    { n: "HLK-E411", nombre: "Valeria", ap: "Soto", email: "valeria.soto@humanlink.mx", fi: "2023-10-30", puesto: "Ejecutiva Comercial", d: dVen, t: tVesp },
    { n: "HLK-E412", nombre: "Roberto", ap: "Núñez", email: "roberto.nunez@humanlink.mx", fi: "2017-12-05", puesto: "Jefe de Almacén", d: dLog, t: tMat },
    { n: "HLK-E413", nombre: "Carmen", ap: "Duarte", email: "carmen.duarte@humanlink.mx", fi: "2022-06-25", puesto: "Analista de Nómina", d: dRH, t: tMat },
    { n: "HLK-E414", nombre: "Ignacio", ap: "Vargas", email: "ignacio.vargas@humanlink.mx", fi: "2021-02-17", puesto: "Técnico de Operaciones", d: dOps, t: tVesp },
    { n: "HLK-E415", nombre: "Adriana", ap: "Luna", email: "adriana.luna@humanlink.mx", fi: "2020-05-03", puesto: "Especialista en Capacitación", d: dRec, t: tMat },
  ];

  const empIds: number[] = [];
  for (const e of nuevos) {
    const emp = await upsertEmpleado({
      numeroEmpleado: e.n,
      nombre: e.nombre,
      apellidoPaterno: e.ap,
      email: e.email,
      fechaIngreso: new Date(e.fi),
      puesto: e.puesto,
      departamentoId: e.d,
      turnoId: e.t,
    });
    empIds.push(emp.id);
  }
  console.log(`✓ Empleados nuevos/actualizados: ${empIds.length}`);

  const vacantesNuevas = [
    { titulo: "Especialista de Soporte TI", dept: dTI, cupo: 2, estado: EstadoVacante.ABIERTA },
    { titulo: "Analista de Datos", dept: dTI, cupo: 1, estado: EstadoVacante.ABIERTA },
    { titulo: "Coordinador de Recursos Humanos", dept: dRH, cupo: 1, estado: EstadoVacante.ABIERTA },
    { titulo: "Ejecutivo de Reclutamiento", dept: dRec, cupo: 3, estado: EstadoVacante.ABIERTA },
    { titulo: "Supervisor de Operaciones", dept: dOps, cupo: 1, estado: EstadoVacante.CERRADA, disp: 0 },
  ];

  const vacIds: number[] = [];
  for (const v of vacantesNuevas) {
    let vac = await prisma.vacante.findFirst({ where: { titulo: v.titulo, departamentoId: v.dept } });
    if (!vac) {
      vac = await prisma.vacante.create({
        data: {
          titulo: v.titulo,
          descripcion: `Oportunidad profesional en ${v.titulo} para reforzar el equipo corporativo.`,
          departamentoId: v.dept,
          cupoTotal: v.cupo,
          cupoDisponible: v.disp ?? v.cupo,
          estado: v.estado,
        },
      });
    }
    vacIds.push(vac.id);
  }
  console.log(`✓ Vacantes verificadas: ${vacIds.length}`);

  const candidatos = [
    { nombre: "Mariana", apellidoPaterno: "Torres", email: "mariana.torres.candidata@humanlink.mx", vacanteId: vacIds[1], etapa: EtapaContratacion.REVISION_CV },
    { nombre: "Eduardo", apellidoPaterno: "López", email: "eduardo.lopez@humanlink.mx", vacanteId: vacIds[0], etapa: EtapaContratacion.ENTREVISTA },
    { nombre: "Fernanda", apellidoPaterno: "García", email: "fernanda.garcia@humanlink.mx", vacanteId: vacIds[3], etapa: EtapaContratacion.EVALUACION },
    { nombre: "Carlos", apellidoPaterno: "Ruiz", email: "carlos.ruiz@humanlink.mx", vacanteId: vacIds[2], etapa: EtapaContratacion.OFERTA },
    { nombre: "Laura", apellidoPaterno: "Mendoza", email: "laura.mendoza@humanlink.mx", vacanteId: vacIds[3], etapa: EtapaContratacion.RECEPCION },
  ];
  for (const c of candidatos) {
    const ex = await prisma.candidato.findFirst({ where: { email: c.email, vacanteId: c.vacanteId } });
    if (!ex) await prisma.candidato.create({ data: c });
  }
  console.log("✓ Candidatos agregados");

  const caps = [
    { nombre: "Gestión efectiva del tiempo", cupo: 15, ins: 6 },
    { nombre: "Introducción a Power BI", cupo: 10, ins: 10 },
    { nombre: "Atención y servicio al cliente", cupo: 25, ins: 8 },
    { nombre: "Liderazgo y comunicación efectiva", cupo: 20, ins: 12 },
  ];
  for (const c of caps) {
    let cap = await prisma.capacitacion.findFirst({ where: { nombre: c.nombre } });
    if (!cap) {
      cap = await prisma.capacitacion.create({
        data: {
          nombre: c.nombre,
          descripcion: "Programa de desarrollo profesional alineado a competencias corporativas.",
          instructor: "María López Hernández",
          fechaInicio: new Date("2026-11-03"),
          fechaFin: new Date("2026-11-07"),
          cupoMaximo: c.cupo,
        },
      });
    }
    const actuales = await prisma.capacitacionEmpleado.count({ where: { capacitacionId: cap.id } });
    const todos = await prisma.empleado.findMany({ where: { activo: true }, select: { id: true }, take: 30 });
    let agregados = 0;
    for (const emp of todos) {
      if (actuales + agregados >= c.ins) break;
      try {
        await prisma.capacitacionEmpleado.create({
          data: { capacitacionId: cap.id, empleadoId: emp.id, estado: "INSCRITO" },
        });
        agregados++;
      } catch {
        /* ya inscrito o cupo */
      }
    }
  }
  console.log("✓ Capacitaciones ampliadas");

  let asistN = 0;
  for (let d = 1; d <= 28; d += 3) {
    for (let i = 0; i < empIds.length; i++) {
      const fecha = new Date(2026, 6, d);
      const estados = [EstadoAsistencia.PUNTUAL, EstadoAsistencia.RETARDO, EstadoAsistencia.FALTA, EstadoAsistencia.PERMISO];
      const estado = estados[(d + i) % estados.length];
      try {
        await prisma.asistencia.create({
          data: {
            empleadoId: empIds[i],
            fecha,
            horaEntrada: estado === EstadoAsistencia.FALTA ? null : estado === EstadoAsistencia.RETARDO ? "08:22" : "08:03",
            horaSalida: estado === EstadoAsistencia.FALTA ? null : "16:00",
            estado,
          },
        });
        asistN++;
      } catch {
        /* duplicado */
      }
    }
  }
  console.log(`✓ Asistencias nuevas: ${asistN}`);

  const eventos = [
    { titulo: "Jornada de integración corporativa", fecha: "2026-10-10T09:00:00", ubicacion: "Centro de convenciones HumanLink" },
    { titulo: "Reunión general trimestral", fecha: "2026-10-28T10:00:00", ubicacion: "Auditorio principal" },
    { titulo: "Taller de bienestar laboral", fecha: "2026-11-05T15:00:00", ubicacion: "Sala de capacitación RH" },
    { titulo: "Jornada de salud ocupacional", fecha: "2026-11-18T08:30:00", ubicacion: "Área común HumanLink Norte" },
  ];
  for (const ev of eventos) {
    const ex = await prisma.eventoOrganizacional.findFirst({ where: { titulo: ev.titulo } });
    if (!ex) {
      const created = await prisma.eventoOrganizacional.create({
        data: {
          titulo: ev.titulo,
          descripcion: "Actividad organizacional para el personal de HumanLink.",
          fecha: new Date(ev.fecha),
          ubicacion: ev.ubicacion,
          inscripcionAbierta: true,
        },
      });
      const sample = empIds.slice(0, 6);
      const resp: ("CONFIRMADO" | "RECHAZADO" | "PENDIENTE")[] = ["CONFIRMADO", "CONFIRMADO", "RECHAZADO", "PENDIENTE", "CONFIRMADO", "PENDIENTE"];
      for (let i = 0; i < sample.length; i++) {
        await prisma.eventoRespuesta.upsert({
          where: { eventoId_empleadoId: { eventoId: created.id, empleadoId: sample[i] } },
          create: { eventoId: created.id, empleadoId: sample[i], respuesta: resp[i] },
          update: {},
        });
      }
    }
  }
  console.log("✓ Eventos organizacionales");

  const total = await prisma.empleado.count({ where: { activo: true } });
  console.log(`\n✅ Total empleados activos: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
