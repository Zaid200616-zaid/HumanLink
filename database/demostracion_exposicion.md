# Guía de demostración — Bases de Datos Avanzadas (HumanLink)

Scripts en `database/` · **No modifican la aplicación Next.js**.  
Aplicar manualmente después de `npm run db:migrate` y `npm run db:seed`.

## Preparación (5 minutos antes de exponer)

```bash
mysql -u root -p < database/setup_mysql.sql
npm run db:migrate
npm run db:seed

mysql -u humanlink -p humanlink < database/triggers_mysql.sql
mysql -u humanlink -p humanlink < database/procedures_mysql.sql
mysql -u humanlink -p humanlink < database/views_mysql.sql
```

Verificar instalación:

```sql
USE humanlink;
SHOW TRIGGERS;
SHOW FULL TABLES WHERE Table_type = 'VIEW';
SHOW PROCEDURE STATUS WHERE Db = 'humanlink';
```

Prueba rápida automatizada (con ROLLBACK):

```bash
mysql -u humanlink -p humanlink < database/pruebas_demostracion.sql
```

---

## 1. Triggers (11 + función auxiliar)

| # | Trigger | RF | Evento | Tabla |
|---|---------|-----|--------|-------|
| — | `fn_dias_vacaciones_lft` | RF-H13 | Función | — |
| 1 | `trg_capacitacion_valida_cupo` | RF-H05 | BEFORE INSERT | CapacitacionEmpleado |
| 2 | `trg_candidato_postulacion_unica` | RF-H04 | BEFORE INSERT | Candidato |
| 3a | `trg_solicitud_validar_saldo_vacaciones` | RF-H13 | BEFORE UPDATE | SolicitudPermiso |
| 3b | `trg_solicitud_descontar_vacaciones` | RF-H13 | AFTER UPDATE | SolicitudPermiso |
| 4 | `trg_empleado_audit_update` | RF-H09 | AFTER UPDATE | Empleado |
| 5 | `trg_empleado_baja_revoca_acceso` | RF-H02 | AFTER UPDATE | Empleado |
| 6 | `trg_candidato_auditoria_alta` | RF-H04 | AFTER INSERT | Candidato |
| 7 | `trg_candidato_auditoria_etapa` | RF-H04 | AFTER UPDATE | Candidato |
| 8 | `trg_asistencia_clasifica` | RF-H06 | BEFORE INSERT | Asistencia |
| 9 | `trg_solicitud_valida_fechas` | RF-H13 | BEFORE INSERT | SolicitudPermiso |
| 10 | `trg_documento_alerta_vencimiento` | RF-H18 | AFTER INSERT | Documento |
| 11 | `trg_historial_reporte_auditoria` | RF-H08 | AFTER INSERT | HistorialReporte |

### Trigger obligatorio 1 — Cupo capacitación (RF-H05)

| Paso | Detalle |
|------|---------|
| **Acción desde el sistema** | Empleado → Capacitaciones → Inscribirse (o vía SQL/SP) |
| **Qué sucede** | `BEFORE INSERT` cuenta inscritos vs `cupoMaximo`; si está lleno → `SIGNAL` |
| **SQL de prueba** | `CALL sp_inscribir_capacitacion(1, 2);` repetido hasta llenar cupo |
| **Evidencia MySQL** | Error: *"La capacitación ya no cuenta con lugares disponibles."* |
| **Consulta evidencia** | `SELECT * FROM VistaCapacitaciones WHERE id = 1;` |

### Trigger obligatorio 2 — Postulación única (RF-H04)

| Paso | Detalle |
|------|---------|
| **Acción** | Formulario público `/postular` o INSERT directo en `Candidato` |
| **Qué sucede** | Impide segundo registro activo (mismo `email` + `vacanteId`) |
| **Evidencia** | Error: *"El candidato ya cuenta con una postulación activa para esa vacante."* |
| **Consulta** | `SELECT email, vacanteId, etapa FROM Candidato WHERE email = '...';` |

### Trigger obligatorio 3 — Descontar vacaciones (RF-H13)

| Paso | Detalle |
|------|---------|
| **Acción** | RH aprueba solicitud: módulo Vacaciones o `CALL sp_aprobar_vacaciones(id, rhId, 'OK');` |
| **Qué sucede** | 3a valida saldo (LFT + extra − usados − pendientes); 3b actualiza `CalculoLaboralInfo` |
| **Evidencia** | `SELECT * FROM CalculoLaboralInfo WHERE empleadoId = X;` — `diasVacaciones` reducido |
| **Nota** | La UI usa `src/lib/vacaciones.ts`; `CalculoLaboralInfo` es capa BD demostrable |

### Triggers 4–11 (resumen demo)

| Trigger | Demo rápida | Evidencia |
|---------|-------------|-----------|
| 4 audit empleado | `UPDATE Empleado SET puesto='Analista Sr' WHERE id=1;` | Fila nueva en `AuditoriaLog` |
| 5 baja acceso | `UPDATE Empleado SET activo=0 WHERE usuarioId IS NOT NULL LIMIT 1;` | `Usuario.activo=0` |
| 6 audit candidato | INSERT en `Candidato` | `AuditoriaLog` acción `POSTULACION_NUEVA` |
| 7 audit etapa | `UPDATE Candidato SET etapa='ENTREVISTA' WHERE id=1;` | `AuditoriaLog` `CAMBIO_ETAPA` |
| 8 asistencia | INSERT con `horaEntrada` tarde | `Asistencia.estado='RETARDO'` |
| 9 fechas solicitud | INSERT con `fechaFin < fechaInicio` | SIGNAL error fechas |
| 10 documento | INSERT `Documento` con vencimiento ≤ 30 días | Nueva fila en `Notificacion` |
| 11 reporte | `CALL sp_generar_reporte_empleados_depto(1,'2026-08');` | Fila en `AuditoriaLog` |

**Compatibilidad Prisma:** Los triggers 6–7 son solo auditoría (no duplican lógica de cupo de la app). El trigger 8 respeta estados `PERMISO`, `VACACION`, `RETARDO`, `FALTA` explícitos.

---

## 2. Procedimientos almacenados (12)

| SP | RF | Módulo HumanLink | Parámetros ejemplo |
|----|-----|------------------|-------------------|
| `sp_registrar_empleado` | RF-H02 | /empleados | número, nombre, apellido, email, fecha, puesto, depto, turno |
| `sp_crear_vacante` | RF-H03 | /vacantes | título, descripción, deptoId, cupo |
| `sp_aprobar_vacaciones` | RF-H13 | /vacaciones | solicitudId, aprobadoPorId, respuesta |
| `sp_registrar_asistencia` | RF-H06 | /asistencias | empleadoId, fecha, entrada, salida, estado |
| `sp_contratar_candidato` | RF-H04 | /candidatos | candidatoId |
| `sp_registrar_documento` | RF-H18 | Expediente | empleadoId, tipo, nombre, ruta, vencimiento |
| `sp_generar_reporte_empleados_depto` | RF-H08 | /reportes | usuarioId, mes (YYYY-MM) |
| `sp_registrar_capacitacion` | RF-H05 | /capacitaciones | nombre, desc, fecha, cupo |
| `sp_actualizar_departamento` | RF-H19 | /departamentos | id, nombre, desc, supervisor, activo |
| `sp_registrar_evento` | RF-H17 | /eventos | título, desc, fecha, ubicación |
| `sp_inscribir_capacitacion` | RF-H05 | /capacitaciones | capacitacionId, empleadoId |
| `sp_consultar_saldo_vacaciones` | RF-H13 | Expediente | empleadoId |

**Ejemplo en consola:**

```sql
CALL sp_consultar_saldo_vacaciones(1);
CALL sp_generar_reporte_empleados_depto(1, '2026-08');
```

**Resultado esperado:** Primer SP devuelve columnas `diasAnualesLFT`, `diasExtra`, `saldoDisponible`. Segundo SP inserta en `HistorialReporte` y devuelve conteo por departamento.

---

## 3. Vistas (9)

| Vista | RF | SELECT demo |
|-------|-----|-------------|
| `VistaEmpleados` | RF-H02 | `SELECT * FROM VistaEmpleados LIMIT 5;` |
| `VistaVacantesAbiertas` | RF-H03 | `SELECT titulo, cupoDisponible, totalCandidatos FROM VistaVacantesAbiertas;` |
| `VistaCapacitaciones` | RF-H05 | `SELECT nombre, inscritos, lugaresDisponibles, estadoCupo FROM VistaCapacitaciones;` |
| `VistaReportes` | RF-H08 | `SELECT * FROM VistaReportes ORDER BY fechaGeneracion DESC LIMIT 5;` |
| `VistaEventos` | RF-H17 | `SELECT titulo, confirmados, pendientes FROM VistaEventos;` |
| `VistaDepartamentos` | RF-H19 | `SELECT nombre, empleadosActivos, vacantesAsociadas FROM VistaDepartamentos;` |
| `VistaAsistencias` | RF-H06 | `SELECT empleado, estado, fecha FROM VistaAsistencias LIMIT 10;` |
| `VistaQuejas` | RF-H16 | `SELECT asunto, diasAntiguedad, estado FROM VistaQuejas;` |
| `VistaCandidatosPipeline` | RF-H04 | `SELECT candidato, etapa, vacante FROM VistaCandidatosPipeline;` |

---

## 4. Consultas avanzadas (12)

Archivo: `database/advanced_queries.sql`

| # | Técnica | RF | Resultado esperado |
|---|---------|-----|-------------------|
| Q1 | INNER JOIN | RF-H02/H19 | Empleados activos con org y depto |
| Q2 | LEFT JOIN | RF-H03/H04 | Vacantes abiertas + conteo candidatos |
| Q3 | RIGHT JOIN | RF-H20 | Turnos incluyendo sin empleados |
| Q4 | GROUP BY + HAVING | RF-H19 | Deptos con >2 empleados |
| Q5 | CASE + SUM | RF-H06 | Resumen asistencias del mes |
| Q6 | AVG/MIN/MAX | RF-H11 | Estadísticas evaluaciones |
| Q7 | Subconsulta | RF-H04 | Candidatos en vacantes sin cupo |
| Q8 | CTE | RF-H13 | Saldos y solicitudes pendientes |
| Q9 | RANK() OVER | RF-H06 | Ranking retardos por depto |
| Q10 | CTE + ventana | RF-H04 | Pipeline % por etapa |
| Q11 | JOIN + DATEDIFF | RF-H18 | Documentos por vencer (30 días) |
| Q12 | Filtro antigüedad | RF-H16 | Quejas >15 días abiertas |

Ejecutar cada bloque en MySQL Workbench y capturar resultado.

---

## 5. Índices

Archivo: `database/indexes_mysql.sql` — inventario **solo de índices reales** del migration Prisma.

```sql
SHOW INDEX FROM Empleado;
SHOW INDEX FROM SolicitudPermiso;

SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
  FROM information_schema.KEY_COLUMN_USAGE
 WHERE TABLE_SCHEMA = 'humanlink' AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## 6. Campos calculados

Archivo: `database/calculated_fields.md` — 12 cálculos verificados (app, vistas o triggers).

Demo cruzada:

```sql
-- LFT en BD
SELECT fn_dias_vacaciones_lft(DATE(fechaIngreso)) FROM Empleado WHERE id = 1;

-- Cupo capacitación en vista
SELECT lugaresDisponibles FROM VistaCapacitaciones WHERE id = 1;
```

---

## 7. Compatibilidad Prisma / HumanLink

| Aspecto | Estado |
|---------|--------|
| Esquema Prisma | Sin cambios |
| Código Next.js | Sin cambios |
| Scripts SQL | Opt-in manual |
| Triggers vs app | Alineados; cupo de vacantes solo en app (triggers 6–7 = auditoría) |
| Vistas / SP | Solo lectura o demo; no invocados por Prisma Client |

---

## 8. Matriz RF por artefacto

Todos los elementos están ligados a RF-H01–RF-H20 (ver columnas RF en cada archivo SQL y en esta guía).

---

## 9. Orden sugerido en la exposición (15–20 min)

1. Mostrar `SHOW TRIGGERS` y explicar los 3 obligatorios.
2. Demo trigger cupo con `sp_inscribir_capacitacion` o UI Capacitaciones.
3. Demo trigger vacaciones: aprobar solicitud + `SELECT * FROM CalculoLaboralInfo`.
4. Ejecutar `CALL sp_consultar_saldo_vacaciones(1)`.
5. Mostrar 2–3 vistas (`VistaEmpleados`, `VistaCapacitaciones`).
6. Ejecutar Q8 (CTE) y Q9 (ventana) de `advanced_queries.sql`.
7. Mostrar `indexes_mysql.sql` + `SHOW INDEX`.
8. Cerrar: app HumanLink funciona igual; capa MySQL es independiente.

---

*HumanLink · MySQL 8 · Prisma · Sin modificación de funcionalidades RF-H01–RF-H20*
