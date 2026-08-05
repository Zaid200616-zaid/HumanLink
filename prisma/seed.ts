import { PrismaClient, EstadoAsistencia, EtapaContratacion, EstadoVacante } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed HumanLink...");

  // Limpiar datos (orden por dependencias)
  await prisma.tokenRecuperacion.deleteMany();
  await prisma.auditoriaLog.deleteMany();
  await prisma.firmaDocumento.deleteMany();
  await prisma.ticketMensaje.deleteMany();
  await prisma.ticketSoporte.deleteMany();
  await prisma.registroHomeOffice.deleteMany();
  await prisma.encuestaRespuesta.deleteMany();
  await prisma.encuesta.deleteMany();
  await prisma.objetivoOKR.deleteMany();
  await prisma.onboardingTareaEmpleado.deleteMany();
  await prisma.onboardingPlantilla.deleteMany();
  await prisma.offboarding.deleteMany();
  await prisma.calculoLaboralInfo.deleteMany();
  await prisma.workflowAprobacion.deleteMany();
  await prisma.comunicado.deleteMany();
  await prisma.reconocimiento.deleteMany();
  await prisma.planCarrera.deleteMany();
  await prisma.competenciaEmpleado.deleteMany();
  await prisma.competencia.deleteMany();
  await prisma.headcountPlan.deleteMany();
  await prisma.incapacidad.deleteMany();
  await prisma.beneficioEmpleado.deleteMany();
  await prisma.activoAsignado.deleteMany();
  await prisma.bolsaHoras.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.sesionUsuario.deleteMany();
  await prisma.preferenciaUsuario.deleteMany();
  await prisma.notificacion.deleteMany();
  await prisma.historialReporte.deleteMany();
  await prisma.eventoRespuesta.deleteMany();
  await prisma.eventoOrganizacional.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.quejaLaboral.deleteMany();
  await prisma.evaluacionDesempeno.deleteMany();
  await prisma.solicitudPermiso.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.capacitacionEmpleado.deleteMany();
  await prisma.capacitacion.deleteMany();
  await prisma.candidato.deleteMany();
  await prisma.vacante.deleteMany();
  await prisma.empleado.deleteMany();
  await prisma.departamento.deleteMany();
  await prisma.organizacion.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.rol.deleteMany();

  const passwordHash = await bcrypt.hash("HumanLink2026!", 12);

  // RF-H07 - Roles
  const rolAdmin = await prisma.rol.create({
    data: {
      nombre: "Administrador",
      descripcion: "Control total del sistema",
      permisos: JSON.stringify([
        "empleados:*", "vacantes:*", "candidatos:*", "capacitaciones:*",
        "asistencias:*", "roles:*", "reportes:*", "departamentos:*",
        "turnos:*", "eventos:*", "quejas:*", "documentos:*", "organizaciones:*",
        "solicitudes:*", "perfil:read", "perfil:write",
      ]),
    },
  });

  const rolRH = await prisma.rol.create({
    data: {
      nombre: "Recursos Humanos",
      descripcion: "Gestión administrativa de personal",
      permisos: JSON.stringify([
        "empleados:read", "empleados:write", "vacantes:*", "candidatos:*",
        "capacitaciones:*", "asistencias:*", "reportes:read", "departamentos:read",
        "turnos:read", "turnos:write",
        "solicitudes:*", "eventos:*", "documentos:*", "perfil:read", "perfil:write",
        "quejas:read", "quejas:*",
      ]),
    },
  });

  const rolEmpleado = await prisma.rol.create({
    data: {
      nombre: "Empleado",
      descripcion: "Consulta de información personal",
      permisos: JSON.stringify([
        "perfil:read", "perfil:write", "capacitaciones:read", "asistencias:read",
        "solicitudes:write", "solicitudes:read", "eventos:read", "quejas:write",
        "expediente:read",
      ]),
    },
  });

  const rolSupervisor = await prisma.rol.create({
    data: {
      nombre: "Supervisor",
      descripcion: "Supervisión de equipo y evaluaciones",
      permisos: JSON.stringify([
        "empleados:read", "asistencias:read", "evaluaciones:write",
        "reportes:read", "departamentos:read", "eventos:read", "perfil:read", "perfil:write",
      ]),
    },
  });

  // RF-H20 - Turnos
  const turnoMatutino = await prisma.turno.create({
    data: { nombre: "Matutino", horaInicio: "08:00", horaFin: "16:00", descripcion: "Jornada diurna estándar de lunes a viernes" },
  });
  const turnoVespertino = await prisma.turno.create({
    data: { nombre: "Vespertino", horaInicio: "14:00", horaFin: "22:00", descripcion: "Cobertura de operaciones y ventas en horario vespertino" },
  });
  const turnoNocturno = await prisma.turno.create({
    data: { nombre: "Nocturno", horaInicio: "22:00", horaFin: "06:00", descripcion: "Atención al cliente y soporte en turno nocturno" },
  });

  // ORGANIZACIONES - Estructura empresarial completa
  const organizaciones = [
    {
      nombre: "HumanLink S.A. de C.V.",
      razonSocial: "HumanLink Soluciones en Recursos Humanos S.A. de C.V.",
      rfc: "HLK260615ABC",
      direccion: "Blvd. Agua Caliente 4558, Zona Río, Tijuana, B.C.",
      telefono: "+52 664 123 4567",
      email: "contacto@humanlink.mx",
      departamentos: [
        { nombre: "Dirección General", descripcion: "Dirección estratégica y gobierno corporativo" },
        { nombre: "Recursos Humanos", descripcion: "Administración del capital humano" },
        { nombre: "Tecnologías de la Información", descripcion: "Desarrollo de software y sistemas" },
        { nombre: "Finanzas y Contabilidad", descripcion: "Gestión financiera (sin nómina en sistema)" },
        { nombre: "Operaciones", descripcion: "Procesos operativos diarios" },
        { nombre: "Ventas y Marketing", descripcion: "Comercialización y posicionamiento" },
        { nombre: "Atención al Cliente", descripcion: "Soporte y servicio al cliente" },
        { nombre: "Legal y Cumplimiento", descripcion: "Asuntos legales y normativos" },
      ],
    },
    {
      nombre: "HumanLink Norte",
      razonSocial: "HumanLink Norte Operaciones S.A. de C.V.",
      rfc: "HLN260615XYZ",
      direccion: "Av. Revolución 1500, Zona Centro, Tijuana, B.C.",
      telefono: "+52 664 987 6543",
      email: "norte@humanlink.mx",
      departamentos: [
        { nombre: "Administración Regional", descripcion: "Coordinación regional norte" },
        { nombre: "Logística", descripcion: "Cadena de suministro y distribución" },
        { nombre: "Almacén", descripcion: "Control de inventarios" },
        { nombre: "Seguridad Industrial", descripcion: "Seguridad y salud ocupacional" },
      ],
    },
    {
      nombre: "HumanLink Pacífico",
      razonSocial: "HumanLink Pacífico Servicios S.A. de C.V.",
      rfc: "HLP260615DEF",
      direccion: "Paseo de los Héroes 10289, Zona Río, Tijuana, B.C.",
      telefono: "+52 664 555 7890",
      email: "pacifico@humanlink.mx",
      departamentos: [
        { nombre: "Capacitación y Desarrollo", descripcion: "Formación del personal" },
        { nombre: "Reclutamiento", descripcion: "Selección y contratación de talento" },
        { nombre: "Bienestar Laboral", descripcion: "Programas de bienestar" },
        { nombre: "Comunicación Interna", descripcion: "Difusión organizacional" },
      ],
    },
    {
      nombre: "UTT HumanLink Campus",
      razonSocial: "Alianza Educativa UTT-HumanLink",
      rfc: "UHL260615GHI",
      direccion: "Universidad Tecnológica de Tijuana, Otay, B.C.",
      telefono: "+52 664 607 8200",
      email: "campus@humanlink.mx",
      departamentos: [
        { nombre: "Prácticas Profesionales", descripcion: "Programa de prácticas estudiantiles" },
        { nombre: "Investigación y Desarrollo", descripcion: "Proyectos de innovación" },
        { nombre: "Vinculación Académica", descripcion: "Relación con instituciones educativas" },
      ],
    },
  ];

  const deptMap: Record<string, number> = {};

  for (const org of organizaciones) {
    const { departamentos, ...orgData } = org;
    const organizacion = await prisma.organizacion.create({
      data: {
        ...orgData,
        ...(org.nombre === "HumanLink S.A. de C.V." && {
          nombreComercial: "HumanLink RH Pro",
          colorPrimario: "#3b82f6",
          colorSecundario: "#22c55e",
          colorAcento: "#8b5cf6",
        }),
      },
    });

    for (const dept of departamentos) {
      const departamento = await prisma.departamento.create({
        data: {
          ...dept,
          organizacionId: organizacion.id,
        },
      });
      deptMap[`${org.nombre}::${dept.nombre}`] = departamento.id;
    }
  }

  // Usuario administrador
  const usuarioAdmin = await prisma.usuario.create({
    data: {
      email: "admin@humanlink.mx",
      passwordHash,
      rolId: rolAdmin.id,
    },
  });

  await prisma.empleado.create({
    data: {
      numeroEmpleado: "HLK-000",
      nombre: "Administrador",
      apellidoPaterno: "HumanLink",
      email: "admin@humanlink.mx",
      fechaIngreso: new Date("2024-01-01"),
      puesto: "Administrador del sistema",
      departamentoId: deptMap["HumanLink S.A. de C.V.::Dirección General"],
      usuarioId: usuarioAdmin.id,
    },
  });

  // Empleados clave
  const empleadosData = [
    {
      numeroEmpleado: "HLK-001",
      nombre: "Guillermo Zaid",
      apellidoPaterno: "Ochoa",
      apellidoMaterno: "Calte",
      email: "guillermo.ochoa@humanlink.mx",
      curp: "OOCG850315HTCCLL09",
      rfc: "OOCG850315ABC",
      telefono: "6641000001",
      puesto: "Director General",
      dept: "HumanLink S.A. de C.V.::Dirección General",
      turnoId: turnoMatutino.id,
      rolId: rolAdmin.id,
    },
    {
      numeroEmpleado: "HLK-002",
      nombre: "Ernesto",
      apellidoPaterno: "Gutiérrez",
      apellidoMaterno: "Rivas",
      email: "ernesto.gutierrez@humanlink.mx",
      curp: "GURE900420HTCRVN02",
      rfc: "GURE900420XYZ",
      telefono: "6641000002",
      puesto: "Gerente de Recursos Humanos",
      dept: "HumanLink S.A. de C.V.::Recursos Humanos",
      turnoId: turnoMatutino.id,
      rolId: rolRH.id,
    },
    {
      numeroEmpleado: "HLK-003",
      nombre: "Ramses",
      apellidoPaterno: "De Jesús",
      apellidoMaterno: "Martínez",
      email: "ramses.dejesus@humanlink.mx",
      curp: "JEMR950815HTCRMS03",
      rfc: "JEMR950815DEF",
      telefono: "6641000003",
      puesto: "Desarrollador Backend Senior",
      dept: "HumanLink S.A. de C.V.::Tecnologías de la Información",
      turnoId: turnoMatutino.id,
      rolId: rolEmpleado.id,
    },
    {
      numeroEmpleado: "HLK-004",
      nombre: "Carol Anne Selene",
      apellidoPaterno: "Olaiz",
      apellidoMaterno: "Ventura",
      email: "carol.olaiz@humanlink.mx",
      curp: "OAVC980210MTCLNR04",
      rfc: "OAVC980210GHI",
      telefono: "6641000004",
      puesto: "Analista de Base de Datos",
      dept: "HumanLink S.A. de C.V.::Tecnologías de la Información",
      turnoId: turnoMatutino.id,
      rolId: rolEmpleado.id,
    },
    {
      numeroEmpleado: "HLK-005",
      nombre: "María",
      apellidoPaterno: "López",
      apellidoMaterno: "Hernández",
      email: "maria.lopez@humanlink.mx",
      curp: "LOHM920530MTCPRR05",
      rfc: "LOHM920530JKL",
      telefono: "6641000005",
      puesto: "Coordinadora de Reclutamiento",
      dept: "HumanLink Pacífico::Reclutamiento",
      turnoId: turnoVespertino.id,
      rolId: rolRH.id,
    },
    {
      numeroEmpleado: "HLK-006",
      nombre: "Carlos",
      apellidoPaterno: "Ramírez",
      apellidoMaterno: "Torres",
      email: "carlos.ramirez@humanlink.mx",
      curp: "RATC880715HTCMRL06",
      rfc: "RATC880715MNO",
      telefono: "6641000006",
      puesto: "Supervisor de Operaciones",
      dept: "HumanLink S.A. de C.V.::Operaciones",
      turnoId: turnoMatutino.id,
      rolId: rolSupervisor.id,
    },
    {
      numeroEmpleado: "HLK-007",
      nombre: "Ana",
      apellidoPaterno: "Martínez",
      apellidoMaterno: "García",
      email: "ana.martinez@humanlink.mx",
      curp: "MAGA910425MTCRNN07",
      rfc: "MAGA910425PQR",
      telefono: "6641000007",
      puesto: "Ejecutiva de Ventas",
      dept: "HumanLink S.A. de C.V.::Ventas y Marketing",
      turnoId: turnoVespertino.id,
      rolId: rolEmpleado.id,
    },
    {
      numeroEmpleado: "HLK-008",
      nombre: "Luis",
      apellidoPaterno: "Fernández",
      apellidoMaterno: "Ruiz",
      email: "luis.fernandez@humanlink.mx",
      curp: "FERL870630HTCRZS08",
      rfc: "FERL870630STU",
      telefono: "6641000008",
      puesto: "Agente de Atención al Cliente",
      dept: "HumanLink S.A. de C.V.::Atención al Cliente",
      turnoId: turnoNocturno.id,
      rolId: rolEmpleado.id,
    },
  ];

  const empleadoIds: number[] = [];
  const usuarioIds: number[] = [];

  for (const emp of empleadosData) {
    const { dept, rolId, ...empData } = emp;
    const usuario = await prisma.usuario.create({
      data: {
        email: emp.email,
        passwordHash,
        rolId,
      },
    });
    usuarioIds.push(usuario.id);

    const empleado = await prisma.empleado.create({
      data: {
        ...empData,
        fechaIngreso: new Date("2024-01-15"),
        departamentoId: deptMap[dept],
        usuarioId: usuario.id,
        salario: 25000,
      },
    });
    empleadoIds.push(empleado.id);
  }

  // Asignar supervisores a departamentos
  await prisma.departamento.update({
    where: { id: deptMap["HumanLink S.A. de C.V.::Dirección General"] },
    data: { supervisorId: empleadoIds[0] },
  });
  await prisma.departamento.update({
    where: { id: deptMap["HumanLink S.A. de C.V.::Recursos Humanos"] },
    data: { supervisorId: empleadoIds[1] },
  });
  await prisma.departamento.update({
    where: { id: deptMap["HumanLink S.A. de C.V.::Tecnologías de la Información"] },
    data: { supervisorId: empleadoIds[2] },
  });
  await prisma.departamento.update({
    where: { id: deptMap["HumanLink S.A. de C.V.::Operaciones"] },
    data: { supervisorId: empleadoIds[5] },
  });
  await prisma.departamento.update({
    where: { id: deptMap["HumanLink Pacífico::Reclutamiento"] },
    data: { supervisorId: empleadoIds[4] },
  });

  // RF-H03 - Vacantes
  const vacanteTI = await prisma.vacante.create({
    data: {
      titulo: "Desarrollador Full Stack",
      descripcion: "Desarrollo y mantenimiento de plataformas internas de gestión de personal y procesos RH.",
      requisitos: "Experiencia en TypeScript, React, APIs REST y bases de datos relacionales. Deseable conocimiento en metodologías ágiles.",
      departamentoId: deptMap["HumanLink S.A. de C.V.::Tecnologías de la Información"],
      cupoTotal: 2,
      cupoDisponible: 2,
      estado: EstadoVacante.ABIERTA,
    },
  });

  await prisma.vacante.create({
    data: {
      titulo: "Analista de Reclutamiento",
      descripcion: "Coordinación de procesos de selección, entrevistas y seguimiento de candidatos en la región Pacífico.",
      departamentoId: deptMap["HumanLink Pacífico::Reclutamiento"],
      cupoTotal: 1,
      cupoDisponible: 1,
      estado: EstadoVacante.ABIERTA,
    },
  });

  await prisma.vacante.create({
    data: {
      titulo: "Coordinador de Logística",
      descripcion: "Supervisión de rutas de distribución, inventarios y cumplimiento de entregas en planta norte.",
      departamentoId: deptMap["HumanLink Norte::Logística"],
      cupoTotal: 1,
      cupoDisponible: 0,
      estado: EstadoVacante.CERRADA,
    },
  });

  // RF-H04 - Candidatos
  await prisma.candidato.create({
    data: {
      nombre: "Juan",
      apellidoPaterno: "Pérez",
      email: "juan.perez@email.com",
      telefono: "6641112233",
      vacanteId: vacanteTI.id,
      etapa: EtapaContratacion.ENTREVISTA,
    },
  });

  await prisma.candidato.create({
    data: {
      nombre: "Laura",
      apellidoPaterno: "Vega",
      apellidoMaterno: "Soto",
      email: "laura.vega@outlook.com",
      telefono: "6642223344",
      vacanteId: vacanteTI.id,
      etapa: EtapaContratacion.REVISION_CV,
    },
  });

  await prisma.candidato.create({
    data: {
      nombre: "Roberto",
      apellidoPaterno: "Mendoza",
      email: "roberto.mendoza@gmail.com",
      telefono: "6643334455",
      vacanteId: vacanteTI.id,
      etapa: EtapaContratacion.EVALUACION,
    },
  });

  // RF-H05 - Capacitaciones
  const cap1 = await prisma.capacitacion.create({
    data: {
      nombre: "Seguridad de la Información",
      descripcion: "Buenas prácticas de protección de datos, contraseñas seguras y manejo responsable de información confidencial.",
      instructor: "Ernesto Gutiérrez",
      fechaInicio: new Date("2026-07-01"),
      fechaFin: new Date("2026-07-05"),
      cupoMaximo: 30,
    },
  });

  const cap2 = await prisma.capacitacion.create({
    data: {
      nombre: "Liderazgo y Comunicación Efectiva",
      descripcion: "Taller para supervisores sobre retroalimentación, resolución de conflictos y trabajo en equipo.",
      instructor: "María López Hernández",
      fechaInicio: new Date("2026-08-12"),
      fechaFin: new Date("2026-08-14"),
      cupoMaximo: 20,
    },
  });

  for (let i = 0; i < 5; i++) {
    await prisma.capacitacionEmpleado.create({
      data: { capacitacionId: cap1.id, empleadoId: empleadoIds[i], estado: "INSCRITO" },
    });
  }

  for (const empIdx of [4, 5, 6]) {
    await prisma.capacitacionEmpleado.create({
      data: { capacitacionId: cap2.id, empleadoId: empleadoIds[empIdx], estado: "INSCRITO" },
    });
  }

  // RF-H06 - Asistencias (RNF02)
  const hoy = new Date();
  const estados: EstadoAsistencia[] = [
    EstadoAsistencia.PUNTUAL,
    EstadoAsistencia.RETARDO,
    EstadoAsistencia.FALTA,
    EstadoAsistencia.PUNTUAL,
    EstadoAsistencia.RETARDO,
    EstadoAsistencia.PUNTUAL,
    EstadoAsistencia.PUNTUAL,
    EstadoAsistencia.FALTA,
  ];

  for (let i = 0; i < empleadoIds.length; i++) {
    await prisma.asistencia.create({
      data: {
        empleadoId: empleadoIds[i],
        fecha: hoy,
        horaEntrada: estados[i] === EstadoAsistencia.FALTA ? null : "08:15",
        horaSalida: estados[i] === EstadoAsistencia.FALTA ? null : "16:00",
        estado: estados[i],
      },
    });
  }

  // RF-H13 - Solicitudes con historial de vacaciones
  await prisma.solicitudPermiso.create({
    data: {
      empleadoId: empleadoIds[6],
      tipo: "VACACION",
      fechaInicio: new Date("2026-08-01"),
      fechaFin: new Date("2026-08-07"),
      diasSolicitados: 5,
      motivo: "Vacaciones familiares en playa",
      estado: "PENDIENTE",
    },
  });

  await prisma.solicitudPermiso.create({
    data: {
      empleadoId: empleadoIds[2],
      tipo: "VACACION",
      fechaInicio: new Date("2026-03-10"),
      fechaFin: new Date("2026-03-14"),
      diasSolicitados: 5,
      motivo: "Vacaciones de semana santa",
      estado: "APROBADA",
      respuesta: "Aprobado conforme a saldo disponible",
      fechaResolucion: new Date("2026-02-15"),
    },
  });

  await prisma.solicitudPermiso.create({
    data: {
      empleadoId: empleadoIds[7],
      tipo: "PERMISO",
      fechaInicio: new Date("2026-07-02"),
      fechaFin: new Date("2026-07-02"),
      diasSolicitados: 1,
      motivo: "Trámite personal en el registro civil",
      estado: "APROBADA",
      respuesta: "Permiso otorgado por un día",
      fechaResolucion: new Date("2026-06-28"),
    },
  });

  await prisma.solicitudPermiso.create({
    data: {
      empleadoId: empleadoIds[3],
      tipo: "VACACION",
      fechaInicio: new Date("2026-12-20"),
      fechaFin: new Date("2026-12-31"),
      diasSolicitados: 8,
      motivo: "Vacaciones de fin de año con familia",
      estado: "PENDIENTE",
    },
  });

  // RF-H11 - Evaluaciones
  await prisma.evaluacionDesempeno.create({
    data: {
      empleadoId: empleadoIds[2],
      evaluadorId: empleadoIds[5],
      periodo: "Q1 2026",
      comentarios: "Excelente desempeño en desarrollo de integraciones y documentación técnica del equipo.",
      puntaje: 95,
    },
  });

  await prisma.evaluacionDesempeno.create({
    data: {
      empleadoId: empleadoIds[3],
      evaluadorId: empleadoIds[2],
      periodo: "Q1 2026",
      comentarios: "Cumple con los objetivos de calidad de datos y optimización de consultas.",
      puntaje: 88,
    },
  });

  await prisma.evaluacionDesempeno.create({
    data: {
      empleadoId: empleadoIds[6],
      evaluadorId: empleadoIds[5],
      periodo: "Q2 2026",
      comentarios: "Buen avance en metas comerciales; se recomienda reforzar seguimiento de cartera.",
      puntaje: 82,
    },
  });

  // RF-H16 - Quejas
  await prisma.quejaLaboral.create({
    data: {
      empleadoId: empleadoIds[7],
      asunto: "Horario de turno nocturno",
      descripcion: "Solicito revisión de horarios de descanso y rotación con el área de operaciones.",
      estado: "REGISTRADA",
    },
  });

  await prisma.quejaLaboral.create({
    data: {
      empleadoId: empleadoIds[6],
      asunto: "Ambiente en área de ventas",
      descripcion: "Reporte de ruido elevado en piso de ventas durante jornada vespertina. Afecta concentración del equipo.",
      estado: "EN_REVISION",
    },
  });

  await prisma.quejaLaboral.create({
    data: {
      empleadoId: empleadoIds[3],
      asunto: "Actualización de equipo de cómputo",
      descripcion: "Equipo asignado presenta lentitud recurrente. Se solicitó revisión a TI sin respuesta en dos semanas.",
      estado: "RESUELTA",
    },
  });

  // RF-H17 - Evento | RNF11
  const evento = await prisma.eventoOrganizacional.create({
    data: {
      titulo: "Junta General Anual 2026",
      descripcion: "Presentación de resultados, reconocimientos al personal y plan estratégico 2026–2027.",
      fecha: new Date("2026-09-15T10:00:00"),
      ubicacion: "Auditorio HumanLink, Blvd. Agua Caliente 4558, Tijuana",
      inscripcionAbierta: true,
    },
  });

  await prisma.eventoOrganizacional.create({
    data: {
      titulo: "Día del Empleado 2026",
      descripcion: "Convivencia corporativa con reconocimientos, actividades recreativas y comida para colaboradores y familiares.",
      fecha: new Date("2026-10-24T09:00:00"),
      ubicacion: "Jardines HumanLink Pacífico, Paseo de los Héroes 10289",
      inscripcionAbierta: true,
    },
  });

  const respuestas: ("CONFIRMADO" | "RECHAZADO" | "PENDIENTE")[] = [
    "CONFIRMADO", "CONFIRMADO", "CONFIRMADO", "CONFIRMADO", "CONFIRMADO",
    "RECHAZADO", "PENDIENTE", "CONFIRMADO",
  ];

  for (let i = 0; i < empleadoIds.length; i++) {
    await prisma.eventoRespuesta.create({
      data: {
        eventoId: evento.id,
        empleadoId: empleadoIds[i],
        respuesta: respuestas[i],
      },
    });
  }

  // Encuesta de clima laboral
  await prisma.encuesta.create({
    data: {
      titulo: "Encuesta de Clima Laboral Q2 2026",
      descripcion: "Tu opinión es importante para mejorar el ambiente de trabajo",
      anonima: true,
      preguntas: JSON.stringify([
        "¿Cómo evalúas tu satisfacción general?",
        "¿Te sientes valorado en tu equipo?",
        "¿Qué mejorarías en la empresa?",
      ]),
    },
  });

  // OKR demo
  await prisma.objetivoOKR.create({
    data: {
      empleadoId: empleadoIds[2],
      titulo: "Modernizar plataforma de gestión de personal",
      periodo: "Q2 2026",
      meta: 100,
      progreso: 75,
    },
  });

  // RF-H18 - Documentos del expediente
  await prisma.documento.create({
    data: {
      empleadoId: empleadoIds[2],
      tipo: "Contrato laboral",
      nombre: "Contrato indefinido HLK-003.pdf",
      rutaArchivo: "/api/uploads/documents/contrato-hlk-003.pdf",
      observaciones: "Contrato firmado el 15 de enero de 2024. Vigencia indefinida.",
    },
  });

  await prisma.documento.create({
    data: {
      empleadoId: empleadoIds[2],
      tipo: "Identificación oficial",
      nombre: "INE Ramses De Jesús.pdf",
      rutaArchivo: "/api/uploads/documents/ine-hlk-003.pdf",
    },
  });

  await prisma.documento.create({
    data: {
      empleadoId: empleadoIds[3],
      tipo: "Contrato laboral",
      nombre: "Contrato indefinido HLK-004.pdf",
      rutaArchivo: "/api/uploads/documents/contrato-hlk-004.pdf",
      observaciones: "Renovación automática conforme a política interna.",
    },
  });

  await prisma.documento.create({
    data: {
      empleadoId: empleadoIds[3],
      tipo: "Certificados",
      nombre: "Certificación MySQL DBA.pdf",
      rutaArchivo: "/api/uploads/documents/cert-mysql-hlk-004.pdf",
      observaciones: "Vigencia hasta diciembre 2027.",
      vencimiento: new Date("2027-12-31"),
    },
  });

  await prisma.documento.create({
    data: {
      empleadoId: empleadoIds[6],
      tipo: "Constancias",
      nombre: "Constancia laboral HLK-007.pdf",
      rutaArchivo: "/api/uploads/documents/constancia-hlk-007.pdf",
      observaciones: "Emitida para trámite bancario en junio 2026.",
    },
  });

  await prisma.documento.create({
    data: {
      empleadoId: empleadoIds[7],
      tipo: "Comprobante de domicilio",
      nombre: "Comprobante domicilio Luis Fernández.pdf",
      rutaArchivo: "/api/uploads/documents/dom-hlk-008.pdf",
    },
  });

  // RF-H08 - Historial de reportes generados
  await prisma.historialReporte.create({
    data: { mes: "2026-07", tipo: "PDF_ADMINISTRATIVO", usuarioId: usuarioAdmin.id },
  });

  await prisma.historialReporte.create({
    data: { mes: "2026-07", tipo: "CSV", usuarioId: usuarioIds[1] },
  });

  await prisma.historialReporte.create({
    data: { mes: "2026-06", tipo: "PDF_ADMINISTRATIVO", usuarioId: usuarioIds[5] },
  });

  // Onboarding tareas para empleados
  const tareasOnb = ["Firmar políticas", "Entregar identificación", "Capacitación de inducción"];
  for (const empId of empleadoIds.slice(0, 3)) {
    for (const t of tareasOnb) {
      await prisma.onboardingTareaEmpleado.create({ data: { empleadoId: empId, tarea: t } });
    }
  }

  // Competencias demo
  const comp1 = await prisma.competencia.create({ data: { nombre: "JavaScript/TypeScript", descripcion: "Desarrollo frontend/backend" } });
  const comp2 = await prisma.competencia.create({ data: { nombre: "Comunicación", descripcion: "Soft skill" } });
  await prisma.competenciaEmpleado.create({ data: { empleadoId: empleadoIds[2], competenciaId: comp1.id, nivel: 4 } });
  await prisma.competenciaEmpleado.create({ data: { empleadoId: empleadoIds[2], competenciaId: comp2.id, nivel: 3 } });

  // Comunicado
  await prisma.comunicado.create({
    data: {
      titulo: "Nueva política de home office 2026",
      contenido: "Se actualizó la política de trabajo remoto. Consulta RH para detalles.",
      autorId: empleadoIds[5],
      fijado: true,
    },
  });

  // Workflow
  await prisma.workflowAprobacion.create({
    data: {
      nombre: "Vacaciones estándar",
      modulo: "solicitudes",
      niveles: JSON.stringify(["Supervisor", "Recursos Humanos"]),
    },
  });

  // Bolsa horas
  await prisma.bolsaHoras.create({
    data: { empleadoId: empleadoIds[2], horas: 8, tipo: "EXTRA", motivo: "Soporte fin de semana" },
  });

  // Beneficio
  await prisma.beneficioEmpleado.create({
    data: { empleadoId: empleadoIds[2], tipo: "Seguro de gastos médicos", descripcion: "Cobertura familiar" },
  });

  // RF-H10 - Notificaciones
  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioAdmin.id,
      titulo: "Bienvenido a HumanLink",
      mensaje: "Plataforma de gestión de recursos humanos lista para operación corporativa.",
      tipo: "SISTEMA",
    },
  });

  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioAdmin.id,
      titulo: "Capacitación próxima",
      mensaje: "El curso Seguridad de la Información inicia el 1 de julio de 2026. Revise inscripciones del personal.",
      tipo: "CAPACITACION",
    },
  });

  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioIds[1],
      titulo: "Solicitud de vacaciones pendiente",
      mensaje: "Ana Martínez solicitó vacaciones del 1 al 7 de agosto de 2026. Requiere revisión de Recursos Humanos.",
      tipo: "SOLICITUD",
    },
  });

  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioIds[4],
      titulo: "Nuevo candidato en proceso",
      mensaje: "Laura Vega Soto avanzó a revisión de CV para la vacante Desarrollador Full Stack.",
      tipo: "CONTRATACION",
    },
  });

  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioIds[6],
      titulo: "Evaluación de desempeño registrada",
      mensaje: "Su evaluación del periodo Q2 2026 fue registrada por su supervisor. Consulte el módulo de evaluaciones.",
      tipo: "EVALUACION",
    },
  });

  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioIds[7],
      titulo: "Queja en seguimiento",
      mensaje: "Su reporte sobre horario de turno nocturno fue recibido y está en revisión por Recursos Humanos.",
      tipo: "QUEJA",
    },
  });

  await prisma.notificacion.create({
    data: {
      usuarioId: usuarioIds[2],
      titulo: "Evento corporativo",
      mensaje: "Confirme su asistencia a la Junta General Anual 2026 el 15 de septiembre en el auditorio principal.",
      tipo: "EVENTO",
    },
  });

  console.log("✅ Seed completado:");
  console.log(`   - ${organizaciones.length} organizaciones`);
  console.log(`   - ${Object.keys(deptMap).length} departamentos`);
  console.log(`   - ${empleadosData.length} empleados`);
  console.log("   Credenciales: admin@humanlink.mx / HumanLink2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
