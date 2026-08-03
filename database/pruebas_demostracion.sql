-- ============================================================================
--  HumanLink · Pruebas de demostración (MySQL 8)
-- ----------------------------------------------------------------------------
--  Ejecutar DESPUÉS de triggers, procedures y views.
--  Las pruebas destructivas están comentadas: ejecutar UNA por UNA en Workbench.
-- ============================================================================

USE humanlink;

SELECT '=== Artefactos instalados ===' AS seccion;
SHOW TRIGGERS FROM humanlink;
SHOW FULL TABLES WHERE Table_type = 'VIEW';
SHOW PROCEDURE STATUS WHERE Db = 'humanlink';

SELECT '=== Vistas (conteo de filas) ===' AS seccion;
SELECT 'VistaEmpleados' AS vista, COUNT(*) AS filas FROM VistaEmpleados
UNION ALL SELECT 'VistaVacantesAbiertas', COUNT(*) FROM VistaVacantesAbiertas
UNION ALL SELECT 'VistaCapacitaciones', COUNT(*) FROM VistaCapacitaciones
UNION ALL SELECT 'VistaQuejas', COUNT(*) FROM VistaQuejas;

SELECT '=== SP saldo vacaciones ===' AS seccion;
SET @emp := (SELECT id FROM Empleado WHERE activo = 1 ORDER BY id LIMIT 1);
CALL sp_consultar_saldo_vacaciones(@emp);

SELECT '=== Función LFT ===' AS seccion;
SELECT id, numeroEmpleado,
       fn_dias_vacaciones_lft(DATE(fechaIngreso)) AS diasLFT
  FROM Empleado WHERE activo = 1 LIMIT 5;

-- --------------------------------------------------------------------------
-- PRUEBAS MANUALES DE TRIGGERS (ejecutar individualmente; capturar error/resultado)
-- --------------------------------------------------------------------------

-- TRIGGER 1 · RF-H05 · Cupo capacitación
-- 1) SELECT id, cupoMaximo FROM Capacitacion;
-- 2) Llenar inscripciones hasta cupoMaximo con CALL sp_inscribir_capacitacion(capId, empId);
-- 3) Repetir inscripción → Error: "La capacitación ya no cuenta con lugares disponibles."

-- TRIGGER 2 · RF-H04 · Postulación única
-- INSERT INTO Candidato (nombre,apellidoPaterno,email,vacanteId,etapa,updatedAt)
-- VALUES ('Test','Demo','mismo@email.com',1,'RECEPCION',NOW(3));
-- Repetir mismo email y vacanteId → Error postulación activa duplicada.

-- TRIGGER 3 · RF-H13 · Vacaciones
-- SELECT id, empleadoId, diasSolicitados FROM SolicitudPermiso
--  WHERE estado='PENDIENTE' AND tipo='VACACION' LIMIT 1;
-- CALL sp_aprobar_vacaciones(<id>, 1, 'Aprobada demo');
-- SELECT * FROM CalculoLaboralInfo WHERE empleadoId = <empId>;

-- TRIGGER 8 · RF-H06 · Clasificación asistencia
-- INSERT INTO Asistencia (empleadoId,fecha,horaEntrada,estado,updatedAt)
-- VALUES (1, CURDATE(), '10:30', 'PUNTUAL', NOW(3));
-- SELECT estado FROM Asistencia WHERE empleadoId=1 AND fecha=CURDATE();
-- Esperado: RETARDO si turno inicia antes y diferencia > 15 min.

-- TRIGGER 10 · RF-H18 · Documento por vencer
-- INSERT INTO Documento (empleadoId,tipo,nombre,rutaArchivo,vencimiento,activo,updatedAt)
-- VALUES (1,'LICENCIA','Licencia demo','/docs/demo.pdf', DATE_ADD(CURDATE(),INTERVAL 7 DAY), 1, NOW(3));
-- SELECT titulo, mensaje FROM Notificacion ORDER BY id DESC LIMIT 1;

-- TRIGGER 11 · RF-H08 · Auditoría reporte
-- CALL sp_generar_reporte_empleados_depto(1, DATE_FORMAT(CURDATE(),'%Y-%m'));
-- SELECT * FROM AuditoriaLog WHERE modulo='reportes' ORDER BY id DESC LIMIT 1;

-- ============================================================================
-- FIN · Ver database/demostracion_exposicion.md para guía completa
-- ============================================================================
