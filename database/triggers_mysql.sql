-- ============================================================================
--  HumanLink · TRIGGERS MySQL 8 (Bases de Datos Avanzadas)
-- ----------------------------------------------------------------------------
--  Ejecutar DESPUÉS de: setup_mysql.sql + prisma migrate deploy
--      mysql -u humanlink -p humanlink < database/triggers_mysql.sql
--
--  NO modifica la aplicación Next.js. Refuerza integridad en MySQL.
-- ============================================================================

USE humanlink;

-- Función auxiliar: días de vacaciones anuales según LFT (RF-H13)
DROP FUNCTION IF EXISTS fn_dias_vacaciones_lft;
DELIMITER $$
CREATE FUNCTION fn_dias_vacaciones_lft(p_fecha_ingreso DATE)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_anios INT;
  IF p_fecha_ingreso IS NULL THEN RETURN 12; END IF;
  SET v_anios = TIMESTAMPDIFF(YEAR, p_fecha_ingreso, CURDATE());
  IF DATE_ADD(p_fecha_ingreso, INTERVAL v_anios YEAR) > CURDATE() THEN
    SET v_anios = v_anios - 1;
  END IF;
  IF v_anios < 1 THEN RETURN 12;
  ELSEIF v_anios = 1 THEN RETURN 12;
  ELSEIF v_anios = 2 THEN RETURN 14;
  ELSEIF v_anios = 3 THEN RETURN 16;
  ELSEIF v_anios = 4 THEN RETURN 18;
  ELSEIF v_anios = 5 THEN RETURN 20;
  ELSEIF v_anios BETWEEN 6 AND 10 THEN RETURN 22;
  ELSEIF v_anios BETWEEN 11 AND 15 THEN RETURN 24;
  ELSEIF v_anios BETWEEN 16 AND 20 THEN RETURN 26;
  ELSEIF v_anios BETWEEN 21 AND 25 THEN RETURN 28;
  ELSEIF v_anios BETWEEN 26 AND 30 THEN RETURN 30;
  ELSE RETURN 32;
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER OBLIGATORIO 1 · trg_capacitacion_valida_cupo
-- RF-H05 · BEFORE INSERT · CapacitacionEmpleado
-- Objetivo: Evitar inscripciones cuando el cupo máximo fue alcanzado.
-- Tablas: CapacitacionEmpleado, Capacitacion
-- ============================================================================
DROP TRIGGER IF EXISTS trg_capacitacion_valida_cupo;
DELIMITER $$
CREATE TRIGGER trg_capacitacion_valida_cupo
BEFORE INSERT ON CapacitacionEmpleado
FOR EACH ROW
BEGIN
  DECLARE v_inscritos INT DEFAULT 0;
  DECLARE v_maximo   INT DEFAULT 0;

  SELECT COUNT(*) INTO v_inscritos
    FROM CapacitacionEmpleado
   WHERE capacitacionId = NEW.capacitacionId;

  SELECT cupoMaximo INTO v_maximo
    FROM Capacitacion
   WHERE id = NEW.capacitacionId;

  IF v_maximo IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La capacitación indicada no existe.';
  END IF;

  IF v_inscritos >= v_maximo THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La capacitación ya no cuenta con lugares disponibles.';
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER OBLIGATORIO 2 · trg_candidato_postulacion_unica
-- RF-H04 · BEFORE INSERT · Candidato
-- Objetivo: Impedir postulaciones activas duplicadas (mismo email + vacante).
-- Tablas: Candidato
-- ============================================================================
DROP TRIGGER IF EXISTS trg_candidato_postulacion_unica;
DELIMITER $$
CREATE TRIGGER trg_candidato_postulacion_unica
BEFORE INSERT ON Candidato
FOR EACH ROW
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe
    FROM Candidato
   WHERE vacanteId = NEW.vacanteId
     AND LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
     AND etapa NOT IN ('RECHAZADO', 'CONTRATADO');

  IF v_existe > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El candidato ya cuenta con una postulación activa para esa vacante.';
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER OBLIGATORIO 3a · trg_solicitud_validar_saldo_vacaciones
-- RF-H13 · BEFORE UPDATE · SolicitudPermiso
-- Objetivo: Validar saldo antes de aprobar vacaciones.
-- Tablas: SolicitudPermiso, Empleado, CalculoLaboralInfo
-- ============================================================================
DROP TRIGGER IF EXISTS trg_solicitud_validar_saldo_vacaciones;
DELIMITER $$
CREATE TRIGGER trg_solicitud_validar_saldo_vacaciones
BEFORE UPDATE ON SolicitudPermiso
FOR EACH ROW
BEGIN
  DECLARE v_disponibles INT DEFAULT 0;
  DECLARE v_dias        INT DEFAULT 0;
  DECLARE v_extra       INT DEFAULT 0;
  DECLARE v_ingreso     DATE;
  DECLARE v_usados      INT DEFAULT 0;
  DECLARE v_pendientes  INT DEFAULT 0;

  IF OLD.estado = 'PENDIENTE' AND NEW.estado = 'APROBADA' AND NEW.tipo = 'VACACION' THEN
    SET v_dias = NEW.diasSolicitados;

    SELECT IFNULL(SUM(diasSolicitados), 0) INTO v_usados
      FROM SolicitudPermiso
     WHERE empleadoId = NEW.empleadoId
       AND tipo = 'VACACION'
       AND estado = 'APROBADA';

    SELECT IFNULL(SUM(diasSolicitados), 0) INTO v_pendientes
      FROM SolicitudPermiso
     WHERE empleadoId = NEW.empleadoId
       AND tipo = 'VACACION'
       AND estado = 'PENDIENTE'
       AND id <> NEW.id;

    SELECT DATE(fechaIngreso), IFNULL(diasVacacionesExtra, 0)
      INTO v_ingreso, v_extra
      FROM Empleado WHERE id = NEW.empleadoId;

    SET v_disponibles = fn_dias_vacaciones_lft(v_ingreso) + v_extra - v_usados - v_pendientes;

    IF v_dias > v_disponibles THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Saldo insuficiente de vacaciones para aprobar la solicitud.';
    END IF;
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER OBLIGATORIO 3b · trg_solicitud_descontar_vacaciones
-- RF-H13 · AFTER UPDATE · SolicitudPermiso
-- Objetivo: Descontar días aprobados en CalculoLaboralInfo (saldo persistido).
-- Tablas: SolicitudPermiso, CalculoLaboralInfo, Empleado
-- ============================================================================
DROP TRIGGER IF EXISTS trg_solicitud_descontar_vacaciones;
DELIMITER $$
CREATE TRIGGER trg_solicitud_descontar_vacaciones
AFTER UPDATE ON SolicitudPermiso
FOR EACH ROW
BEGIN
  DECLARE v_extra  INT DEFAULT 0;
  DECLARE v_ingreso DATE;
  DECLARE v_usados INT DEFAULT 0;
  DECLARE v_saldo  INT DEFAULT 0;

  IF OLD.estado = 'PENDIENTE' AND NEW.estado = 'APROBADA' AND NEW.tipo = 'VACACION' THEN
    SELECT DATE(fechaIngreso), IFNULL(diasVacacionesExtra, 0)
      INTO v_ingreso, v_extra
      FROM Empleado WHERE id = NEW.empleadoId;

    SELECT IFNULL(SUM(diasSolicitados), 0) INTO v_usados
      FROM SolicitudPermiso
     WHERE empleadoId = NEW.empleadoId
       AND tipo = 'VACACION'
       AND estado = 'APROBADA';

    SET v_saldo = GREATEST(fn_dias_vacaciones_lft(v_ingreso) + v_extra - v_usados, 0);

    INSERT INTO CalculoLaboralInfo (empleadoId, diasVacaciones, notas, updatedAt)
    VALUES (
      NEW.empleadoId,
      v_saldo,
      CONCAT('Saldo actualizado por solicitud #', NEW.id, ' · ', v_saldo, ' día(s) restantes'),
      NOW(3)
    )
    ON DUPLICATE KEY UPDATE
      diasVacaciones = v_saldo,
      notas = VALUES(notas),
      updatedAt = NOW(3);
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 4 · trg_empleado_audit_update
-- RF-H09 · AFTER UPDATE · Empleado · Auditoría de cambios sensibles
-- ============================================================================
DROP TRIGGER IF EXISTS trg_empleado_audit_update;
DELIMITER $$
CREATE TRIGGER trg_empleado_audit_update
AFTER UPDATE ON Empleado
FOR EACH ROW
BEGIN
  IF (OLD.puesto <> NEW.puesto)
     OR (IFNULL(OLD.salario, 0) <> IFNULL(NEW.salario, 0))
     OR (IFNULL(OLD.departamentoId, 0) <> IFNULL(NEW.departamentoId, 0)) THEN
    INSERT INTO AuditoriaLog (usuarioId, email, accion, modulo, detalle, createdAt)
    VALUES (
      NEW.usuarioId, NEW.email, 'ACTUALIZACION_EMPLEADO', 'empleados',
      CONCAT('Empleado #', NEW.id, ' | puesto: ', OLD.puesto, ' -> ', NEW.puesto),
      NOW(3)
    );
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 5 · trg_empleado_baja_revoca_acceso
-- RF-H02 · AFTER UPDATE · Empleado · Revocar acceso al dar de baja
-- ============================================================================
DROP TRIGGER IF EXISTS trg_empleado_baja_revoca_acceso;
DELIMITER $$
CREATE TRIGGER trg_empleado_baja_revoca_acceso
AFTER UPDATE ON Empleado
FOR EACH ROW
BEGIN
  IF OLD.activo = 1 AND NEW.activo = 0 AND NEW.usuarioId IS NOT NULL THEN
    UPDATE Usuario SET activo = 0 WHERE id = NEW.usuarioId;
    UPDATE SesionUsuario SET activa = 0 WHERE usuarioId = NEW.usuarioId;
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 6 · trg_candidato_auditoria_alta
-- RF-H04 · AFTER INSERT · Candidato · Trazabilidad (no altera cupo: lo gestiona la app)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_candidato_bloquea_cupo;
DROP TRIGGER IF EXISTS trg_candidato_auditoria_alta;
DELIMITER $$
CREATE TRIGGER trg_candidato_auditoria_alta
AFTER INSERT ON Candidato
FOR EACH ROW
BEGIN
  INSERT INTO AuditoriaLog (accion, modulo, detalle, createdAt)
  VALUES (
    'POSTULACION_NUEVA',
    'candidatos',
    CONCAT('Candidato ', NEW.nombre, ' ', NEW.apellidoPaterno,
           ' · vacante #', NEW.vacanteId, ' · etapa ', NEW.etapa),
    NOW(3)
  );
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 7 · trg_candidato_auditoria_etapa
-- RF-H04 · AFTER UPDATE · Candidato · Registro de cambio de etapa
-- ============================================================================
DROP TRIGGER IF EXISTS trg_candidato_resuelve_cupo;
DROP TRIGGER IF EXISTS trg_candidato_auditoria_etapa;
DELIMITER $$
CREATE TRIGGER trg_candidato_auditoria_etapa
AFTER UPDATE ON Candidato
FOR EACH ROW
BEGIN
  IF OLD.etapa <> NEW.etapa THEN
    INSERT INTO AuditoriaLog (accion, modulo, detalle, createdAt)
    VALUES (
      'CAMBIO_ETAPA',
      'candidatos',
      CONCAT('Candidato #', NEW.id, ': ', OLD.etapa, ' → ', NEW.etapa),
      NOW(3)
    );
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 8 · trg_asistencia_clasifica
-- RF-H06 · RNF02 · BEFORE INSERT · Asistencia · Clasificar puntualidad
-- ============================================================================
DROP TRIGGER IF EXISTS trg_asistencia_clasifica;
DELIMITER $$
CREATE TRIGGER trg_asistencia_clasifica
BEFORE INSERT ON Asistencia
FOR EACH ROW
trg_asistencia_clasifica: BEGIN
  DECLARE v_hora_turno VARCHAR(191);
  DECLARE v_dif_min    INT;

  IF NEW.estado IN ('PERMISO', 'VACACION', 'RETARDO', 'FALTA') THEN
    LEAVE trg_asistencia_clasifica;
  END IF;

  IF NEW.horaEntrada IS NULL OR NEW.horaEntrada = '' THEN
    SET NEW.estado = 'FALTA';
  ELSE
    SELECT t.horaInicio INTO v_hora_turno
      FROM Empleado e
      JOIN Turno t ON t.id = e.turnoId
     WHERE e.id = NEW.empleadoId;

    IF v_hora_turno IS NULL THEN
      SET NEW.estado = 'PUNTUAL';
    ELSE
      SET v_dif_min = (
        TIME_TO_SEC(STR_TO_DATE(NEW.horaEntrada, '%H:%i'))
        - TIME_TO_SEC(STR_TO_DATE(v_hora_turno, '%H:%i'))
      ) / 60;
      IF v_dif_min > 15 THEN SET NEW.estado = 'RETARDO';
      ELSE SET NEW.estado = 'PUNTUAL';
      END IF;
    END IF;
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 9 · trg_solicitud_valida_fechas
-- RF-H13 · BEFORE INSERT · SolicitudPermiso · Validación de fechas y días
-- ============================================================================
DROP TRIGGER IF EXISTS trg_solicitud_valida_fechas;
DELIMITER $$
CREATE TRIGGER trg_solicitud_valida_fechas
BEFORE INSERT ON SolicitudPermiso
FOR EACH ROW
BEGIN
  IF NEW.fechaFin < NEW.fechaInicio THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La fecha fin no puede ser anterior a la fecha inicio.';
  END IF;

  IF NEW.diasSolicitados IS NULL OR NEW.diasSolicitados <= 0 THEN
    SET NEW.diasSolicitados = DATEDIFF(NEW.fechaFin, NEW.fechaInicio) + 1;
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 10 · trg_documento_alerta_vencimiento
-- RF-H18 · AFTER INSERT · Documento · Alerta de vencimiento próximo
-- ============================================================================
DROP TRIGGER IF EXISTS trg_documento_alerta_vencimiento;
DELIMITER $$
CREATE TRIGGER trg_documento_alerta_vencimiento
AFTER INSERT ON Documento
FOR EACH ROW
BEGIN
  DECLARE v_usuario INT;

  IF NEW.vencimiento IS NOT NULL
     AND NEW.vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN
    SELECT usuarioId INTO v_usuario FROM Empleado WHERE id = NEW.empleadoId;
    IF v_usuario IS NOT NULL THEN
      INSERT INTO Notificacion (usuarioId, titulo, mensaje, tipo, leida, createdAt)
      VALUES (
        v_usuario,
        'Documento próximo a vencer',
        CONCAT('El documento "', NEW.nombre, '" vence el ',
               DATE_FORMAT(NEW.vencimiento, '%d/%m/%Y')),
        'DOCUMENTO', 0, NOW(3)
      );
    END IF;
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- TRIGGER 11 · trg_historial_reporte_auditoria
-- RF-H08 · AFTER INSERT · HistorialReporte · Trazabilidad de reportes
-- ============================================================================
DROP TRIGGER IF EXISTS trg_historial_reporte_auditoria;
DELIMITER $$
CREATE TRIGGER trg_historial_reporte_auditoria
AFTER INSERT ON HistorialReporte
FOR EACH ROW
BEGIN
  INSERT INTO AuditoriaLog (usuarioId, accion, modulo, detalle, createdAt)
  VALUES (
    NEW.usuarioId,
    'REPORTE_GENERADO',
    'reportes',
    CONCAT('Reporte ', NEW.tipo, ' · mes ', NEW.mes),
    NOW(3)
  );
END$$
DELIMITER ;

-- ============================================================================
-- FIN · 11 triggers + 1 función auxiliar
-- ============================================================================
