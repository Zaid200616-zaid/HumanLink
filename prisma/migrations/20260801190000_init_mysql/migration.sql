-- CreateTable
CREATE TABLE `Rol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `permisos` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Rol_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `rolId` INTEGER NOT NULL,
    `intentosFallidos` INTEGER NOT NULL DEFAULT 0,
    `bloqueadoHasta` DATETIME(3) NULL,
    `totpSecret` VARCHAR(191) NULL,
    `totpEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    INDEX `Usuario_rolId_idx`(`rolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organizacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `razonSocial` VARCHAR(191) NULL,
    `rfc` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `logoUrl` VARCHAR(500) NULL,
    `nombreComercial` VARCHAR(191) NULL,
    `colorPrimario` VARCHAR(191) NULL DEFAULT '#3b82f6',
    `colorSecundario` VARCHAR(191) NULL DEFAULT '#22c55e',
    `colorAcento` VARCHAR(191) NULL DEFAULT '#8b5cf6',
    `diasAnticipacionVacacion` INTEGER NOT NULL DEFAULT 7,
    `maxDiasConsecutivosVacacion` INTEGER NOT NULL DEFAULT 15,
    `permitirHomeOffice` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Departamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `organizacionId` INTEGER NOT NULL,
    `supervisorId` INTEGER NULL,
    `ubicacion` VARCHAR(191) NULL,
    `cantidadVacantes` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Departamento_organizacionId_idx`(`organizacionId`),
    INDEX `Departamento_supervisorId_idx`(`supervisorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Turno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFin` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Turno_nombre_idx`(`nombre`),
    INDEX `Turno_activo_idx`(`activo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Empleado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroEmpleado` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidoPaterno` VARCHAR(191) NOT NULL,
    `apellidoMaterno` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `curp` VARCHAR(191) NULL,
    `rfc` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `fechaNacimiento` DATETIME(3) NULL,
    `fechaIngreso` DATETIME(3) NOT NULL,
    `puesto` VARCHAR(191) NOT NULL,
    `salario` DECIMAL(65, 30) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fotoUrl` VARCHAR(500) NULL,
    `diasVacacionesExtra` INTEGER NOT NULL DEFAULT 0,
    `departamentoId` INTEGER NULL,
    `turnoId` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Empleado_numeroEmpleado_key`(`numeroEmpleado`),
    UNIQUE INDEX `Empleado_email_key`(`email`),
    UNIQUE INDEX `Empleado_curp_key`(`curp`),
    UNIQUE INDEX `Empleado_rfc_key`(`rfc`),
    UNIQUE INDEX `Empleado_usuarioId_key`(`usuarioId`),
    INDEX `Empleado_departamentoId_idx`(`departamentoId`),
    INDEX `Empleado_nombre_apellidoPaterno_idx`(`nombre`, `apellidoPaterno`),
    INDEX `Empleado_puesto_idx`(`puesto`),
    INDEX `Empleado_turnoId_idx`(`turnoId`),
    INDEX `Empleado_activo_idx`(`activo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vacante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `requisitos` TEXT NULL,
    `departamentoId` INTEGER NOT NULL,
    `cupoTotal` INTEGER NOT NULL DEFAULT 1,
    `cupoDisponible` INTEGER NOT NULL DEFAULT 1,
    `cupoBloqueado` INTEGER NOT NULL DEFAULT 0,
    `estado` ENUM('ABIERTA', 'CERRADA', 'PAUSADA') NOT NULL DEFAULT 'ABIERTA',
    `fechaPublicacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaCierre` DATETIME(3) NULL,
    `modalidad` VARCHAR(191) NULL,
    `tipoEmpleo` VARCHAR(191) NULL,
    `ubicacion` VARCHAR(191) NULL,
    `salario` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vacante_departamentoId_idx`(`departamentoId`),
    INDEX `Vacante_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Candidato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidoPaterno` VARCHAR(191) NOT NULL,
    `apellidoMaterno` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `curp` VARCHAR(191) NULL,
    `rfc` VARCHAR(191) NULL,
    `direccion` TEXT NULL,
    `escolaridad` VARCHAR(191) NULL,
    `experiencia` TEXT NULL,
    `cartaPresentacion` TEXT NULL,
    `curriculum` VARCHAR(500) NULL,
    `vacanteId` INTEGER NOT NULL,
    `etapa` ENUM('RECEPCION', 'REVISION_CV', 'ENTREVISTA', 'EVALUACION', 'OFERTA', 'CONTRATADO', 'RECHAZADO') NOT NULL DEFAULT 'RECEPCION',
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Candidato_vacanteId_idx`(`vacanteId`),
    INDEX `Candidato_etapa_idx`(`etapa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactoLead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `asunto` VARCHAR(191) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Capacitacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `instructor` VARCHAR(191) NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NULL,
    `cupoMaximo` INTEGER NOT NULL DEFAULT 30,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'PROGRAMADA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CapacitacionEmpleado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `capacitacionId` INTEGER NOT NULL,
    `empleadoId` INTEGER NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'INSCRITO',
    `calificacion` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CapacitacionEmpleado_empleadoId_idx`(`empleadoId`),
    UNIQUE INDEX `CapacitacionEmpleado_capacitacionId_empleadoId_key`(`capacitacionId`, `empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asistencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `horaEntrada` VARCHAR(191) NULL,
    `horaSalida` VARCHAR(191) NULL,
    `turnoNombre` VARCHAR(191) NULL,
    `estado` ENUM('PUNTUAL', 'RETARDO', 'FALTA', 'PERMISO', 'VACACION') NOT NULL DEFAULT 'PUNTUAL',
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Asistencia_fecha_idx`(`fecha`),
    INDEX `Asistencia_estado_idx`(`estado`),
    UNIQUE INDEX `Asistencia_empleadoId_fecha_key`(`empleadoId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SolicitudPermiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `tipo` ENUM('PERMISO', 'VACACION') NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NOT NULL,
    `diasSolicitados` INTEGER NOT NULL DEFAULT 1,
    `motivo` TEXT NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    `aprobacionSupervisor` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'NO_APLICA') NOT NULL DEFAULT 'PENDIENTE',
    `supervisorRespuesta` TEXT NULL,
    `supervisorAprobadoPorId` INTEGER NULL,
    `supervisorFechaResolucion` DATETIME(3) NULL,
    `respuesta` TEXT NULL,
    `aprobadoPorId` INTEGER NULL,
    `fechaResolucion` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SolicitudPermiso_empleadoId_idx`(`empleadoId`),
    INDEX `SolicitudPermiso_estado_idx`(`estado`),
    INDEX `SolicitudPermiso_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvaluacionDesempeno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `evaluadorId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'DESEMPENO',
    `periodo` VARCHAR(191) NOT NULL,
    `comentarios` TEXT NOT NULL,
    `puntaje` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EvaluacionDesempeno_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuejaLaboral` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `asunto` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `estado` ENUM('REGISTRADA', 'EN_REVISION', 'EN_PROCESO', 'RESUELTA', 'CERRADA') NOT NULL DEFAULT 'REGISTRADA',
    `seguimiento` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuejaLaboral_estado_idx`(`estado`),
    INDEX `QuejaLaboral_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuejaHistorial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quejaId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `estadoAnterior` VARCHAR(191) NOT NULL,
    `estadoNuevo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `QuejaHistorial_quejaId_idx`(`quejaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventoOrganizacional` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `ubicacion` VARCHAR(191) NULL,
    `inscripcionAbierta` BOOLEAN NOT NULL DEFAULT true,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventoRespuesta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventoId` INTEGER NOT NULL,
    `empleadoId` INTEGER NOT NULL,
    `respuesta` ENUM('PENDIENTE', 'CONFIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EventoRespuesta_eventoId_idx`(`eventoId`),
    UNIQUE INDEX `EventoRespuesta_eventoId_empleadoId_key`(`eventoId`, `empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Documento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `rutaArchivo` VARCHAR(500) NOT NULL,
    `observaciones` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `vencimiento` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Documento_empleadoId_idx`(`empleadoId`),
    INDEX `Documento_tipo_idx`(`tipo`),
    INDEX `Documento_activo_idx`(`activo`),
    INDEX `Documento_vencimiento_idx`(`vencimiento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistorialReporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mes` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistorialReporte_mes_idx`(`mes`),
    INDEX `HistorialReporte_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notificacion_usuarioId_leida_idx`(`usuarioId`, `leida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditoriaLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NULL,
    `email` VARCHAR(191) NULL,
    `accion` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `detalle` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditoriaLog_modulo_idx`(`modulo`),
    INDEX `AuditoriaLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ObjetivoOKR` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `meta` INTEGER NOT NULL DEFAULT 100,
    `progreso` INTEGER NOT NULL DEFAULT 0,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ObjetivoOKR_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Encuesta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `anonima` BOOLEAN NOT NULL DEFAULT true,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `preguntas` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EncuestaRespuesta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `encuestaId` INTEGER NOT NULL,
    `empleadoId` INTEGER NULL,
    `respuestas` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EncuestaRespuesta_encuestaId_idx`(`encuestaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegistroHomeOffice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroHomeOffice_fecha_idx`(`fecha`),
    UNIQUE INDEX `RegistroHomeOffice_empleadoId_fecha_key`(`empleadoId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketSoporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `asunto` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `prioridad` VARCHAR(191) NOT NULL DEFAULT 'MEDIA',
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ABIERTO',
    `asignadoA` VARCHAR(191) NULL,
    `slaHoras` INTEGER NOT NULL DEFAULT 48,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TicketSoporte_estado_idx`(`estado`),
    INDEX `TicketSoporte_prioridad_idx`(`prioridad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketMensaje` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `autorId` INTEGER NULL,
    `autorNombre` VARCHAR(191) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `esRH` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketMensaje_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmaDocumento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `documento` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `firmado` BOOLEAN NOT NULL DEFAULT false,
    `firmaHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FirmaDocumento_empleadoId_documento_version_key`(`empleadoId`, `documento`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OnboardingPlantilla` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `tareas` TEXT NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OnboardingTareaEmpleado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `tarea` VARCHAR(500) NOT NULL,
    `completada` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OnboardingTareaEmpleado_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Offboarding` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `fechaBaja` DATETIME(3) NOT NULL,
    `notas` TEXT NULL,
    `checklist` TEXT NULL,
    `completado` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Offboarding_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TokenRecuperacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TokenRecuperacion_token_key`(`token`),
    INDEX `TokenRecuperacion_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PreferenciaUsuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tema` VARCHAR(191) NOT NULL DEFAULT 'light',
    `idioma` VARCHAR(191) NOT NULL DEFAULT 'es',

    UNIQUE INDEX `PreferenciaUsuario_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SesionUsuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(500) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    INDEX `SesionUsuario_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `destino` VARCHAR(191) NOT NULL,
    `asunto` VARCHAR(191) NOT NULL,
    `cuerpo` TEXT NOT NULL,
    `enviado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BolsaHoras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `horas` DOUBLE NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BolsaHoras_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivoAsignado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `serial` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ASIGNADO',
    `fechaAsignacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaDevolucion` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivoAsignado_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BeneficioEmpleado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `vigenciaHasta` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BeneficioEmpleado_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incapacidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NOT NULL,
    `certificado` VARCHAR(500) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVA',
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Incapacidad_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HeadcountPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `departamentoId` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `planeada` INTEGER NOT NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HeadcountPlan_departamentoId_anio_mes_key`(`departamentoId`, `anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Competencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Competencia_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompetenciaEmpleado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `competenciaId` INTEGER NOT NULL,
    `nivel` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CompetenciaEmpleado_empleadoId_competenciaId_key`(`empleadoId`, `competenciaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanCarrera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `puestoObjetivo` VARCHAR(191) NOT NULL,
    `plazo` VARCHAR(191) NOT NULL,
    `notas` TEXT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlanCarrera_empleadoId_idx`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reconocimiento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deEmpleadoId` INTEGER NOT NULL,
    `aEmpleadoId` INTEGER NOT NULL,
    `mensaje` TEXT NOT NULL,
    `badge` VARCHAR(191) NOT NULL DEFAULT 'ESTRELLA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Reconocimiento_aEmpleadoId_idx`(`aEmpleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comunicado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `contenido` TEXT NOT NULL,
    `autorId` INTEGER NOT NULL,
    `fijado` BOOLEAN NOT NULL DEFAULT false,
    `publicado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Comunicado_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkflowAprobacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `niveles` TEXT NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalculoLaboralInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `diasVacaciones` INTEGER NOT NULL DEFAULT 0,
    `primaVacacionalPct` DOUBLE NOT NULL DEFAULT 25,
    `aguinaldoDias` INTEGER NOT NULL DEFAULT 15,
    `notas` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CalculoLaboralInfo_empleadoId_key`(`empleadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_rolId_fkey` FOREIGN KEY (`rolId`) REFERENCES `Rol`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Departamento` ADD CONSTRAINT `Departamento_organizacionId_fkey` FOREIGN KEY (`organizacionId`) REFERENCES `Organizacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Departamento` ADD CONSTRAINT `Departamento_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Empleado`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Empleado` ADD CONSTRAINT `Empleado_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `Departamento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Empleado` ADD CONSTRAINT `Empleado_turnoId_fkey` FOREIGN KEY (`turnoId`) REFERENCES `Turno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Empleado` ADD CONSTRAINT `Empleado_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vacante` ADD CONSTRAINT `Vacante_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `Departamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidato` ADD CONSTRAINT `Candidato_vacanteId_fkey` FOREIGN KEY (`vacanteId`) REFERENCES `Vacante`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapacitacionEmpleado` ADD CONSTRAINT `CapacitacionEmpleado_capacitacionId_fkey` FOREIGN KEY (`capacitacionId`) REFERENCES `Capacitacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapacitacionEmpleado` ADD CONSTRAINT `CapacitacionEmpleado_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitudPermiso` ADD CONSTRAINT `SolicitudPermiso_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluacionDesempeno` ADD CONSTRAINT `EvaluacionDesempeno_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluacionDesempeno` ADD CONSTRAINT `EvaluacionDesempeno_evaluadorId_fkey` FOREIGN KEY (`evaluadorId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuejaLaboral` ADD CONSTRAINT `QuejaLaboral_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuejaHistorial` ADD CONSTRAINT `QuejaHistorial_quejaId_fkey` FOREIGN KEY (`quejaId`) REFERENCES `QuejaLaboral`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuejaHistorial` ADD CONSTRAINT `QuejaHistorial_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoRespuesta` ADD CONSTRAINT `EventoRespuesta_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `EventoOrganizacional`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoRespuesta` ADD CONSTRAINT `EventoRespuesta_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documento` ADD CONSTRAINT `Documento_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialReporte` ADD CONSTRAINT `HistorialReporte_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacion` ADD CONSTRAINT `Notificacion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ObjetivoOKR` ADD CONSTRAINT `ObjetivoOKR_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EncuestaRespuesta` ADD CONSTRAINT `EncuestaRespuesta_encuestaId_fkey` FOREIGN KEY (`encuestaId`) REFERENCES `Encuesta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EncuestaRespuesta` ADD CONSTRAINT `EncuestaRespuesta_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroHomeOffice` ADD CONSTRAINT `RegistroHomeOffice_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketSoporte` ADD CONSTRAINT `TicketSoporte_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMensaje` ADD CONSTRAINT `TicketMensaje_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `TicketSoporte`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmaDocumento` ADD CONSTRAINT `FirmaDocumento_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OnboardingTareaEmpleado` ADD CONSTRAINT `OnboardingTareaEmpleado_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offboarding` ADD CONSTRAINT `Offboarding_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PreferenciaUsuario` ADD CONSTRAINT `PreferenciaUsuario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionUsuario` ADD CONSTRAINT `SesionUsuario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BolsaHoras` ADD CONSTRAINT `BolsaHoras_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivoAsignado` ADD CONSTRAINT `ActivoAsignado_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BeneficioEmpleado` ADD CONSTRAINT `BeneficioEmpleado_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incapacidad` ADD CONSTRAINT `Incapacidad_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HeadcountPlan` ADD CONSTRAINT `HeadcountPlan_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `Departamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetenciaEmpleado` ADD CONSTRAINT `CompetenciaEmpleado_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetenciaEmpleado` ADD CONSTRAINT `CompetenciaEmpleado_competenciaId_fkey` FOREIGN KEY (`competenciaId`) REFERENCES `Competencia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanCarrera` ADD CONSTRAINT `PlanCarrera_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reconocimiento` ADD CONSTRAINT `Reconocimiento_deEmpleadoId_fkey` FOREIGN KEY (`deEmpleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reconocimiento` ADD CONSTRAINT `Reconocimiento_aEmpleadoId_fkey` FOREIGN KEY (`aEmpleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comunicado` ADD CONSTRAINT `Comunicado_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalculoLaboralInfo` ADD CONSTRAINT `CalculoLaboralInfo_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `Empleado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
