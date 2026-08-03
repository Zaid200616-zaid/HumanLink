-- ============================================================================
--  HumanLink · PROCEDIMIENTOS ALMACENADOS MySQL 8
-- ----------------------------------------------------------------------------
--      mysql -u humanlink -p humanlink < database/procedures_mysql.sql
--  Ejecutar DESPUÉS de triggers_mysql.sql (usa fn_dias_vacaciones_lft)
-- ============================================================================

USE humanlink;

-- --------------------------------------------------------------------------
-- SP 1 · sp_registrar_empleado
-- RF-H02 · Módulo: Empleados (/empleados)
-- Parámetros: datos básicos del empleado
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_empleado;
DELIMITER $$
CREATE PROCEDURE sp_registrar_empleado(
  IN p_numeroEmpleado VARCHAR(191),
  IN p_nombre VARCHAR(191),
  IN p_apellidoPaterno VARCHAR(191),
  IN p_email VARCHAR(191),
  IN p_fechaIngreso DATETIME(3),
  IN p_puesto VARCHAR(191),
  IN p_departamentoId INT,
  IN p_turnoId INT
)
BEGIN
  INSERT INTO Empleado (
    numeroEmpleado, nombre, apellidoPaterno, email,
    fechaIngreso, puesto, departamentoId, turnoId, activo, updatedAt
  ) VALUES (
    p_numeroEmpleado, p_nombre, p_apellidoPaterno, p_email,
    p_fechaIngreso, p_puesto, p_departamentoId, p_turnoId, 1, NOW(3)
  );
  SELECT LAST_INSERT_ID() AS empleadoId;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 2 · sp_crear_vacante
-- RF-H03 · Módulo: Vacantes (/vacantes)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_crear_vacante;
DELIMITER $$
CREATE PROCEDURE sp_crear_vacante(
  IN p_titulo VARCHAR(191),
  IN p_descripcion TEXT,
  IN p_departamentoId INT,
  IN p_cupoTotal INT
)
BEGIN
  INSERT INTO Vacante (
    titulo, descripcion, departamentoId, cupoTotal, cupoDisponible,
    estado, updatedAt
  ) VALUES (
    p_titulo, p_descripcion, p_departamentoId, p_cupoTotal, p_cupoTotal,
    'ABIERTA', NOW(3)
  );
  SELECT LAST_INSERT_ID() AS vacanteId;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 3 · sp_aprobar_vacaciones
-- RF-H13 · Módulo: Permisos y Vacaciones (/solicitudes)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_aprobar_vacaciones;
DELIMITER $$
CREATE PROCEDURE sp_aprobar_vacaciones(
  IN p_solicitudId INT,
  IN p_aprobadoPorId INT,
  IN p_respuesta TEXT
)
BEGIN
  UPDATE SolicitudPermiso
     SET estado = 'APROBADA',
         aprobadoPorId = p_aprobadoPorId,
         respuesta = p_respuesta,
         fechaResolucion = NOW(3),
         updatedAt = NOW(3)
   WHERE id = p_solicitudId
     AND tipo = 'VACACION'
     AND estado = 'PENDIENTE';
  SELECT ROW_COUNT() AS filasActualizadas;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 4 · sp_registrar_asistencia
-- RF-H06 · Módulo: Asistencias (/asistencias)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_asistencia;
DELIMITER $$
CREATE PROCEDURE sp_registrar_asistencia(
  IN p_empleadoId INT,
  IN p_fecha DATETIME(3),
  IN p_horaEntrada VARCHAR(191),
  IN p_horaSalida VARCHAR(191),
  IN p_estado ENUM('PUNTUAL','RETARDO','FALTA','PERMISO','VACACION')
)
BEGIN
  INSERT INTO Asistencia (
    empleadoId, fecha, horaEntrada, horaSalida, estado, updatedAt
  ) VALUES (
    p_empleadoId, p_fecha, p_horaEntrada, p_horaSalida, p_estado, NOW(3)
  )
  ON DUPLICATE KEY UPDATE
    horaEntrada = VALUES(horaEntrada),
    horaSalida = VALUES(horaSalida),
    estado = VALUES(estado),
    updatedAt = NOW(3);
  SELECT id FROM Asistencia
   WHERE empleadoId = p_empleadoId AND fecha = p_fecha;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 5 · sp_contratar_candidato
-- RF-H04 · Módulo: Contrataciones (/candidatos)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_contratar_candidato;
DELIMITER $$
CREATE PROCEDURE sp_contratar_candidato(
  IN p_candidatoId INT
)
BEGIN
  UPDATE Candidato
     SET etapa = 'CONTRATADO', updatedAt = NOW(3)
   WHERE id = p_candidatoId
     AND etapa <> 'CONTRATADO';
  SELECT ROW_COUNT() AS actualizado;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 6 · sp_registrar_documento
-- RF-H18 · Módulo: Documentos (/documentos)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_documento;
DELIMITER $$
CREATE PROCEDURE sp_registrar_documento(
  IN p_empleadoId INT,
  IN p_tipo VARCHAR(191),
  IN p_nombre VARCHAR(191),
  IN p_rutaArchivo VARCHAR(500),
  IN p_vencimiento DATETIME(3)
)
BEGIN
  INSERT INTO Documento (
    empleadoId, tipo, nombre, rutaArchivo, vencimiento, activo, updatedAt
  ) VALUES (
    p_empleadoId, p_tipo, p_nombre, p_rutaArchivo, p_vencimiento, 1, NOW(3)
  );
  SELECT LAST_INSERT_ID() AS documentoId;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 7 · sp_generar_reporte_empleados_depto
-- RF-H08 · Módulo: Reportes (/reportes)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_generar_reporte_empleados_depto;
DELIMITER $$
CREATE PROCEDURE sp_generar_reporte_empleados_depto(
  IN p_usuarioId INT,
  IN p_mes VARCHAR(7)
)
BEGIN
  INSERT INTO HistorialReporte (mes, tipo, usuarioId, createdAt)
  VALUES (p_mes, 'EMPLEADOS_POR_DEPARTAMENTO', p_usuarioId, NOW(3));

  SELECT d.nombre AS departamento,
         COUNT(e.id) AS empleadosActivos
    FROM Departamento d
    LEFT JOIN Empleado e ON e.departamentoId = d.id AND e.activo = 1
   GROUP BY d.id, d.nombre
   ORDER BY empleadosActivos DESC;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 8 · sp_registrar_capacitacion
-- RF-H05 · Módulo: Capacitaciones (/capacitaciones)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_capacitacion;
DELIMITER $$
CREATE PROCEDURE sp_registrar_capacitacion(
  IN p_nombre VARCHAR(191),
  IN p_descripcion TEXT,
  IN p_fechaInicio DATETIME(3),
  IN p_cupoMaximo INT
)
BEGIN
  INSERT INTO Capacitacion (
    nombre, descripcion, fechaInicio, cupoMaximo, estado, updatedAt
  ) VALUES (
    p_nombre, p_descripcion, p_fechaInicio, p_cupoMaximo, 'PROGRAMADA', NOW(3)
  );
  SELECT LAST_INSERT_ID() AS capacitacionId;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 9 · sp_actualizar_departamento
-- RF-H19 · Módulo: Departamentos (/departamentos)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_actualizar_departamento;
DELIMITER $$
CREATE PROCEDURE sp_actualizar_departamento(
  IN p_departamentoId INT,
  IN p_nombre VARCHAR(191),
  IN p_descripcion TEXT,
  IN p_supervisorId INT,
  IN p_activo TINYINT(1)
)
BEGIN
  UPDATE Departamento
     SET nombre = p_nombre,
         descripcion = p_descripcion,
         supervisorId = p_supervisorId,
         activo = p_activo,
         updatedAt = NOW(3)
   WHERE id = p_departamentoId;
  SELECT ROW_COUNT() AS filasActualizadas;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 10 · sp_registrar_evento
-- RF-H17 · Módulo: Eventos (/eventos)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_evento;
DELIMITER $$
CREATE PROCEDURE sp_registrar_evento(
  IN p_titulo VARCHAR(191),
  IN p_descripcion TEXT,
  IN p_fecha DATETIME(3),
  IN p_ubicacion VARCHAR(191)
)
BEGIN
  INSERT INTO EventoOrganizacional (
    titulo, descripcion, fecha, ubicacion, inscripcionAbierta, activo, updatedAt
  ) VALUES (
    p_titulo, p_descripcion, p_fecha, p_ubicacion, 1, 1, NOW(3)
  );
  SELECT LAST_INSERT_ID() AS eventoId;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 11 · sp_inscribir_capacitacion (integración RF-H05)
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_inscribir_capacitacion;
DELIMITER $$
CREATE PROCEDURE sp_inscribir_capacitacion(
  IN p_capacitacionId INT,
  IN p_empleadoId INT
)
BEGIN
  INSERT INTO CapacitacionEmpleado (capacitacionId, empleadoId, estado, createdAt)
  VALUES (p_capacitacionId, p_empleadoId, 'INSCRITO', NOW(3));
  SELECT LAST_INSERT_ID() AS inscripcionId;
END$$
DELIMITER ;

-- --------------------------------------------------------------------------
-- SP 12 · sp_consultar_saldo_vacaciones
-- RF-H13 · Expediente vacaciones
-- --------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_consultar_saldo_vacaciones;
DELIMITER $$
CREATE PROCEDURE sp_consultar_saldo_vacaciones(
  IN p_empleadoId INT
)
BEGIN
  DECLARE v_lft INT;
  DECLARE v_extra INT DEFAULT 0;
  DECLARE v_usados INT DEFAULT 0;
  DECLARE v_pendientes INT DEFAULT 0;
  DECLARE v_ingreso DATE;

  SELECT DATE(fechaIngreso), IFNULL(diasVacacionesExtra, 0)
    INTO v_ingreso, v_extra FROM Empleado WHERE id = p_empleadoId;

  SET v_lft = fn_dias_vacaciones_lft(v_ingreso);

  SELECT IFNULL(SUM(diasSolicitados), 0) INTO v_usados
    FROM SolicitudPermiso
   WHERE empleadoId = p_empleadoId AND tipo = 'VACACION' AND estado = 'APROBADA';

  SELECT IFNULL(SUM(diasSolicitados), 0) INTO v_pendientes
    FROM SolicitudPermiso
   WHERE empleadoId = p_empleadoId AND tipo = 'VACACION' AND estado = 'PENDIENTE';

  SELECT p_empleadoId AS empleadoId,
         v_lft AS diasAnualesLFT,
         v_extra AS diasExtra,
         (v_lft + v_extra) AS diasTotales,
         GREATEST(v_lft + v_extra - v_usados - v_pendientes, 0) AS saldoDisponible,
         IFNULL(
           (SELECT diasVacaciones FROM CalculoLaboralInfo WHERE empleadoId = p_empleadoId),
           GREATEST(v_lft + v_extra - v_usados, 0)
         ) AS saldoPersistidoBD;
END$$
DELIMITER ;

-- ============================================================================
-- FIN · 12 procedimientos almacenados
-- ============================================================================
