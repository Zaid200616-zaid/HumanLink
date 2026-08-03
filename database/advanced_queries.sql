-- ============================================================================
--  HumanLink · CONSULTAS AVANZADAS MySQL 8
-- ----------------------------------------------------------------------------
--  Ejecutar en MySQL Workbench o CLI para evidencia académica.
--      mysql -u humanlink -p humanlink < database/advanced_queries.sql
-- ============================================================================

USE humanlink;

-- ============================================================================
-- Q1 · INNER JOIN — Empleados por departamento y organización
-- RF-H02 / RF-H19
-- Objetivo: Listar personal activo con su estructura organizacional.
-- ============================================================================
SELECT
  o.nombre AS organizacion,
  d.nombre AS departamento,
  e.numeroEmpleado,
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
  e.puesto
FROM Empleado e
INNER JOIN Departamento d ON d.id = e.departamentoId
INNER JOIN Organizacion o ON o.id = d.organizacionId
WHERE e.activo = 1
ORDER BY o.nombre, d.nombre, e.apellidoPaterno;

-- ============================================================================
-- Q2 · LEFT JOIN — Vacantes abiertas aunque no tengan candidatos
-- RF-H03 / RF-H04
-- ============================================================================
SELECT
  v.titulo,
  v.cupoDisponible,
  d.nombre AS departamento,
  IFNULL(COUNT(c.id), 0) AS candidatos
FROM Vacante v
INNER JOIN Departamento d ON d.id = v.departamentoId
LEFT JOIN Candidato c ON c.vacanteId = v.id
WHERE v.estado = 'ABIERTA'
GROUP BY v.id, v.titulo, v.cupoDisponible, d.nombre;

-- ============================================================================
-- Q3 · RIGHT JOIN — Turnos y empleados asignados (incluye turnos vacíos)
-- RF-H20
-- ============================================================================
SELECT
  t.nombre AS turno,
  t.horaInicio,
  t.horaFin,
  e.numeroEmpleado,
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado
FROM Empleado e
RIGHT JOIN Turno t ON t.id = e.turnoId AND e.activo = 1
WHERE t.activo = 1
ORDER BY t.nombre, e.apellidoPaterno;

-- ============================================================================
-- Q4 · GROUP BY + HAVING — Departamentos con más de 2 empleados activos
-- RF-H19
-- ============================================================================
SELECT
  d.nombre AS departamento,
  COUNT(e.id) AS totalEmpleados
FROM Departamento d
INNER JOIN Empleado e ON e.departamentoId = d.id AND e.activo = 1
GROUP BY d.id, d.nombre
HAVING COUNT(e.id) > 2
ORDER BY totalEmpleados DESC;

-- ============================================================================
-- Q5 · CASE + SUM + COUNT — Resumen de asistencias por estado (mes actual)
-- RF-H06
-- ============================================================================
SELECT
  CASE a.estado
    WHEN 'PUNTUAL'  THEN 'Puntual'
    WHEN 'RETARDO'  THEN 'Retardo'
    WHEN 'FALTA'    THEN 'Falta'
    WHEN 'PERMISO'  THEN 'Permiso'
    WHEN 'VACACION' THEN 'Vacación'
    ELSE 'Otro'
  END AS clasificacion,
  COUNT(*) AS registros,
  SUM(CASE WHEN a.estado IN ('PUNTUAL','RETARDO') THEN 1 ELSE 0 END) AS asistenciasValidas
FROM Asistencia a
WHERE a.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
GROUP BY a.estado
ORDER BY registros DESC;

-- ============================================================================
-- Q6 · AVG, MIN, MAX — Estadísticas de evaluaciones de desempeño
-- RF-H11
-- ============================================================================
SELECT
  e.numeroEmpleado,
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
  COUNT(ed.id) AS totalEvaluaciones,
  ROUND(AVG(ed.puntaje), 2) AS promedioPuntaje,
  MIN(ed.puntaje) AS puntajeMinimo,
  MAX(ed.puntaje) AS puntajeMaximo
FROM EvaluacionDesempeno ed
INNER JOIN Empleado e ON e.id = ed.empleadoId
WHERE ed.puntaje IS NOT NULL
GROUP BY e.id, e.numeroEmpleado, e.nombre, e.apellidoPaterno
HAVING COUNT(ed.id) >= 1;

-- ============================================================================
-- Q7 · Subconsulta — Candidatos en vacantes con cupo agotado
-- RF-H04
-- ============================================================================
SELECT
  c.nombre,
  c.apellidoPaterno,
  c.email,
  c.etapa,
  v.titulo
FROM Candidato c
INNER JOIN Vacante v ON v.id = c.vacanteId
WHERE v.id IN (
  SELECT id FROM Vacante WHERE cupoDisponible = 0 AND estado = 'ABIERTA'
)
ORDER BY c.createdAt DESC;

-- ============================================================================
-- Q8 · CTE — Solicitudes pendientes por empleado con saldo estimado
-- RF-H13
-- ============================================================================
WITH saldos AS (
  SELECT
    e.id AS empleadoId,
    fn_dias_vacaciones_lft(DATE(e.fechaIngreso)) + IFNULL(e.diasVacacionesExtra, 0) AS diasTotales,
    IFNULL(cli.diasVacaciones, fn_dias_vacaciones_lft(DATE(e.fechaIngreso)) + IFNULL(e.diasVacacionesExtra, 0)) AS saldo
  FROM Empleado e
  LEFT JOIN CalculoLaboralInfo cli ON cli.empleadoId = e.id
),
pendientes AS (
  SELECT empleadoId, SUM(diasSolicitados) AS diasPendientes
  FROM SolicitudPermiso
  WHERE estado = 'PENDIENTE' AND tipo = 'VACACION'
  GROUP BY empleadoId
)
SELECT
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
  s.diasTotales,
  s.saldo AS saldoDisponible,
  IFNULL(p.diasPendientes, 0) AS diasPendientesAprobacion
FROM Empleado e
INNER JOIN saldos s ON s.empleadoId = e.id
LEFT JOIN pendientes p ON p.empleadoId = e.id
WHERE e.activo = 1;

-- ============================================================================
-- Q9 · Función de ventana — Ranking de retardos por departamento
-- RF-H06
-- ============================================================================
SELECT
  departamento,
  empleado,
  totalRetardos,
  RANK() OVER (PARTITION BY departamento ORDER BY totalRetardos DESC) AS rankingRetardos
FROM (
  SELECT
    d.nombre AS departamento,
    CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
    COUNT(a.id) AS totalRetardos
  FROM Asistencia a
  INNER JOIN Empleado e ON e.id = a.empleadoId
  LEFT JOIN Departamento d ON d.id = e.departamentoId
  WHERE a.estado = 'RETARDO'
  GROUP BY d.nombre, e.id, e.nombre, e.apellidoPaterno
) AS sub;

-- ============================================================================
-- Q10 · CTE + JOIN — Pipeline de contratación por etapa
-- RF-H04
-- ============================================================================
WITH pipeline AS (
  SELECT etapa, COUNT(*) AS total
  FROM Candidato
  GROUP BY etapa
)
SELECT
  p.etapa,
  p.total,
  ROUND(p.total * 100.0 / SUM(p.total) OVER (), 2) AS porcentaje
FROM pipeline p
ORDER BY FIELD(p.etapa,
  'RECEPCION','REVISION_CV','ENTREVISTA','EVALUACION','OFERTA','CONTRATADO','RECHAZADO');

-- ============================================================================
-- Q11 · Documentos por vencer (subconsulta correlacionada)
-- RF-H18
-- ============================================================================
SELECT
  e.numeroEmpleado,
  doc.nombre AS documento,
  doc.tipo,
  doc.vencimiento,
  DATEDIFF(doc.vencimiento, CURDATE()) AS diasParaVencer
FROM Documento doc
INNER JOIN Empleado e ON e.id = doc.empleadoId
WHERE doc.activo = 1
  AND doc.vencimiento IS NOT NULL
  AND doc.vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY doc.vencimiento ASC;

-- ============================================================================
-- Q12 · Quejas antiguas sin resolver (RNF-PQ01)
-- RF-H16
-- ============================================================================
SELECT
  q.id,
  q.asunto,
  q.estado,
  DATEDIFF(CURDATE(), DATE(q.createdAt)) AS diasAbierta,
  CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado
FROM QuejaLaboral q
INNER JOIN Empleado e ON e.id = q.empleadoId
WHERE q.estado NOT IN ('RESUELTA', 'CERRADA')
  AND DATEDIFF(CURDATE(), DATE(q.createdAt)) > 15
ORDER BY diasAbierta DESC;

-- ============================================================================
-- FIN · 12 consultas avanzadas
-- ============================================================================
