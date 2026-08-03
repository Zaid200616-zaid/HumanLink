-- ============================================================================
--  HumanLink · VISTAS MySQL 8 (Bases de Datos Avanzadas)
-- ----------------------------------------------------------------------------
--      mysql -u humanlink -p humanlink < database/views_mysql.sql
-- ============================================================================

USE humanlink;

-- --------------------------------------------------------------------------
-- Vista 1 · VistaEmpleados
-- RF-H02 · Empleados activos con departamento, turno y organización
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaEmpleados AS
SELECT
  e.id,
  e.numeroEmpleado,
  CONCAT(e.nombre, ' ', e.apellidoPaterno,
         IFNULL(CONCAT(' ', e.apellidoMaterno), '')) AS nombreCompleto,
  e.email,
  e.puesto,
  e.activo,
  d.nombre AS departamento,
  o.nombre AS organizacion,
  t.nombre AS turno,
  e.fechaIngreso,
  e.diasVacacionesExtra
FROM Empleado e
LEFT JOIN Departamento d ON d.id = e.departamentoId
LEFT JOIN Organizacion o ON o.id = d.organizacionId
LEFT JOIN Turno t ON t.id = e.turnoId;

-- --------------------------------------------------------------------------
-- Vista 2 · VistaVacantesAbiertas
-- RF-H03 · Vacantes publicables con cupo y departamento
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaVacantesAbiertas AS
SELECT
  v.id,
  v.titulo,
  v.estado,
  v.cupoTotal,
  v.cupoDisponible,
  v.cupoBloqueado,
  v.modalidad,
  v.ubicacion,
  v.fechaPublicacion,
  d.nombre AS departamento,
  o.nombre AS organizacion,
  (SELECT COUNT(*) FROM Candidato c WHERE c.vacanteId = v.id) AS totalCandidatos
FROM Vacante v
INNER JOIN Departamento d ON d.id = v.departamentoId
INNER JOIN Organizacion o ON o.id = d.organizacionId
WHERE v.estado = 'ABIERTA';

-- --------------------------------------------------------------------------
-- Vista 3 · VistaCapacitaciones
-- RF-H05 · Capacitaciones con ocupación de cupo
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaCapacitaciones AS
SELECT
  c.id,
  c.nombre,
  c.instructor,
  c.fechaInicio,
  c.fechaFin,
  c.cupoMaximo,
  c.estado,
  COUNT(ce.id) AS inscritos,
  (c.cupoMaximo - COUNT(ce.id)) AS lugaresDisponibles,
  CASE
    WHEN COUNT(ce.id) >= c.cupoMaximo THEN 'LLENO'
    WHEN COUNT(ce.id) >= c.cupoMaximo * 0.8 THEN 'CASI_LLENO'
    ELSE 'DISPONIBLE'
  END AS estadoCupo
FROM Capacitacion c
LEFT JOIN CapacitacionEmpleado ce ON ce.capacitacionId = c.id
GROUP BY c.id, c.nombre, c.instructor, c.fechaInicio, c.fechaFin, c.cupoMaximo, c.estado;

-- --------------------------------------------------------------------------
-- Vista 4 · VistaReportes
-- RF-H08 · Historial de reportes generados
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaReportes AS
SELECT
  h.id,
  h.mes,
  h.tipo,
  h.createdAt AS fechaGeneracion,
  u.email AS generadoPor,
  r.nombre AS rolGenerador
FROM HistorialReporte h
INNER JOIN Usuario u ON u.id = h.usuarioId
INNER JOIN Rol r ON r.id = u.rolId;

-- --------------------------------------------------------------------------
-- Vista 5 · VistaEventos
-- RF-H17 · Eventos con resumen de confirmaciones
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaEventos AS
SELECT
  ev.id,
  ev.titulo,
  ev.fecha,
  ev.ubicacion,
  ev.inscripcionAbierta,
  ev.activo,
  COUNT(er.id) AS totalRespuestas,
  SUM(CASE WHEN er.respuesta = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmados,
  SUM(CASE WHEN er.respuesta = 'RECHAZADO' THEN 1 ELSE 0 END) AS rechazados,
  SUM(CASE WHEN er.respuesta = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes
FROM EventoOrganizacional ev
LEFT JOIN EventoRespuesta er ON er.eventoId = ev.id
GROUP BY ev.id, ev.titulo, ev.fecha, ev.ubicacion, ev.inscripcionAbierta, ev.activo;

-- --------------------------------------------------------------------------
-- Vista 6 · VistaDepartamentos
-- RF-H19 · Departamentos con métricas de personal y vacantes
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaDepartamentos AS
SELECT
  d.id,
  d.nombre,
  d.activo,
  o.nombre AS organizacion,
  CONCAT(s.nombre, ' ', s.apellidoPaterno) AS supervisor,
  COUNT(DISTINCT e.id) AS empleadosActivos,
  COUNT(DISTINCT v.id) AS vacantesAsociadas,
  d.cantidadVacantes AS limiteVacantes
FROM Departamento d
INNER JOIN Organizacion o ON o.id = d.organizacionId
LEFT JOIN Empleado s ON s.id = d.supervisorId
LEFT JOIN Empleado e ON e.departamentoId = d.id AND e.activo = 1
LEFT JOIN Vacante v ON v.departamentoId = d.id
GROUP BY d.id, d.nombre, d.activo, o.nombre, s.nombre, s.apellidoPaterno, d.cantidadVacantes;

-- --------------------------------------------------------------------------
-- Vista 7 · VistaAsistencias
-- RF-H06 · Asistencias del mes actual con datos del empleado
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaAsistencias AS
SELECT
  a.id,
  a.fecha,
  a.horaEntrada,
  a.horaSalida,
  a.estado,
  a.turnoNombre,
  e.numeroEmpleado,
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
  d.nombre AS departamento
FROM Asistencia a
INNER JOIN Empleado e ON e.id = a.empleadoId
LEFT JOIN Departamento d ON d.id = e.departamentoId
WHERE a.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01');

-- --------------------------------------------------------------------------
-- Vista 8 · VistaQuejas
-- RF-H16 · Quejas laborales con antigüedad en días
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaQuejas AS
SELECT
  q.id,
  q.asunto,
  q.estado,
  q.createdAt AS fechaRegistro,
  DATEDIFF(CURDATE(), DATE(q.createdAt)) AS diasAntiguedad,
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
  d.nombre AS departamento,
  (SELECT COUNT(*) FROM QuejaHistorial qh WHERE qh.quejaId = q.id) AS movimientosHistorial
FROM QuejaLaboral q
INNER JOIN Empleado e ON e.id = q.empleadoId
LEFT JOIN Departamento d ON d.id = e.departamentoId;

-- --------------------------------------------------------------------------
-- Vista 9 · VistaCandidatosPipeline (RF-H04 · contrataciones)
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW VistaCandidatosPipeline AS
SELECT
  c.id,
  CONCAT(c.nombre, ' ', c.apellidoPaterno) AS candidato,
  c.email,
  c.etapa,
  v.titulo AS vacante,
  d.nombre AS departamento,
  c.createdAt AS fechaPostulacion
FROM Candidato c
INNER JOIN Vacante v ON v.id = c.vacanteId
INNER JOIN Departamento d ON d.id = v.departamentoId;

-- ============================================================================
-- FIN · 9 vistas administrativas
-- ============================================================================
