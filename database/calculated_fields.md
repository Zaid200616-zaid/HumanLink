# HumanLink — Campos calculados y fórmulas

Documentación para la materia **Bases de Datos Avanzadas**.  
No modifica la aplicación; describe cálculos en app, vistas SQL y triggers.

---

## 1. Días de vacaciones anuales (LFT México)

| Atributo | Valor |
|----------|--------|
| **Tabla** | `Empleado` (origen: `fechaIngreso`) |
| **RF** | RF-H13 |
| **Campo calculado** | `diasAnualesLFT` |
| **Fórmula** | Función `fn_dias_vacaciones_lft(fechaIngreso)` según antigüedad |
| **Implementación** | App: `src/lib/vacaciones.ts` · BD: `database/triggers_mysql.sql` |
| **Explicación** | 12 días el primer año; escala hasta 32 días según tabla LFT |

---

## 2. Saldo de vacaciones persistido

| Atributo | Valor |
|----------|--------|
| **Tabla** | `CalculoLaboralInfo.diasVacaciones` |
| **RF** | RF-H13 |
| **Campo calculado** | Saldo restante |
| **Fórmula** | `saldo_inicial - SUM(diasSolicitados aprobadas)` |
| **Implementación** | Trigger `trg_solicitud_descontar_vacaciones` |
| **Explicación** | Tabla auxiliar no usada por la UI principal; refuerzo académico en MySQL |

---

## 3. Días totales de vacaciones del empleado

| Atributo | Valor |
|----------|--------|
| **Tabla** | `Empleado` |
| **RF** | RF-H13 |
| **Fórmula** | `diasAnualesLFT + diasVacacionesExtra` |
| **Implementación** | App: `construirExpedienteVacaciones()` |
| **Explicación** | Días legales más días adicionales otorgados por RH |

---

## 4. Días disponibles (expediente)

| Atributo | Valor |
|----------|--------|
| **Tabla** | Derivado de `SolicitudPermiso` + `Empleado` |
| **RF** | RF-H13 |
| **Fórmula** | `diasTotales - diasUsados - diasPendientes` |
| **Implementación** | `src/lib/vacaciones.ts` |
| **Explicación** | `diasUsados` = suma de solicitudes VACACION en estado APROBADA |

---

## 5. Días solicitados en solicitud

| Atributo | Valor |
|----------|--------|
| **Tabla** | `SolicitudPermiso.diasSolicitados` |
| **RF** | RF-H13 |
| **Fórmula** | `DATEDIFF(fechaFin, fechaInicio) + 1` si no se envía explícito |
| **Implementación** | Trigger `trg_solicitud_valida_fechas` · App: `calcularDiasHabiles()` |
| **Explicación** | Trigger usa días calendario; app puede usar días hábiles en validación UI |

---

## 6. Cupo disponible de vacante

| Atributo | Valor |
|----------|--------|
| **Tabla** | `Vacante` |
| **RF** | RF-H03 / RF-H04 |
| **Campos** | `cupoTotal`, `cupoDisponible`, `cupoBloqueado` (columnas reales en `Vacante`) |
| **Fórmula** | La app ajusta cupo en `src/app/api/candidatos/route.ts`; las vistas calculan ocupación |
| **Implementación** | App + `VistaVacantesAbiertas` · consulta Q7 en `advanced_queries.sql` |
| **Explicación** | RNF10 — bloqueo temporal al recibir postulación (lógica de negocio en Next.js) |

---

## 7. Lugares disponibles en capacitación

| Atributo | Valor |
|----------|--------|
| **Tabla** | `Capacitacion` + `CapacitacionEmpleado` |
| **RF** | RF-H05 |
| **Fórmula** | `cupoMaximo - COUNT(inscripciones)` |
| **Implementación** | Vista `VistaCapacitaciones` · Trigger `trg_capacitacion_valida_cupo` |
| **Explicación** | Evita sobreinscripción a nivel BD |

---

## 8. Clasificación de asistencia

| Atributo | Valor |
|----------|--------|
| **Tabla** | `Asistencia.estado` |
| **RF** | RF-H06 / RNF02 |
| **Fórmula** | Si `horaEntrada` > `turno.horaInicio + 15 min` → RETARDO; sin entrada → FALTA |
| **Implementación** | Trigger `trg_asistencia_clasifica` |
| **Explicación** | Colores en UI según enum `EstadoAsistencia` |

---

## 9. Antigüedad de queja laboral

| Atributo | Valor |
|----------|--------|
| **Tabla** | `QuejaLaboral` |
| **RF** | RF-H16 / RNF-PQ01 |
| **Fórmula** | `DATEDIFF(CURDATE(), DATE(createdAt))` |
| **Implementación** | Vista `VistaQuejas` · App: `src/lib/quejas-utils.ts` |
| **Explicación** | Priorización de quejas más antiguas |

---

## 10. Porcentaje de asistencia del día

| Atributo | Valor |
|----------|--------|
| **Tabla** | `Asistencia` (agregado) |
| **RF** | RF-H06 |
| **Fórmula** | `(puntuales + retardos) / totalEvaluable * 100` |
| **Implementación** | App: `/api/asistencias/estadisticas` |
| **Explicación** | KPI mostrado en dashboard de asistencias |

---

## 11. Prima vacacional informativa

| Atributo | Valor |
|----------|--------|
| **Tabla** | `CalculoLaboralInfo.primaVacacionalPct` |
| **RF** | Informativo (sin nómina) |
| **Valor default** | 25 (%) |
| **Explicación** | Referencia LFT; no calcula nómina en el sistema |

---

## 12. Confirmación de eventos

| Atributo | Valor |
|----------|--------|
| **Tabla** | `EventoRespuesta` |
| **RF** | RF-H17 |
| **Fórmula** | `COUNT(CONFIRMADO) / COUNT(total)` |
| **Implementación** | Vista `VistaEventos` |
| **Explicación** | Resumen numérico RNF-PE01 |

---

## Evidencia de ejecución

Para capturas de pantalla en la tesina:

```sql
-- Saldo vacaciones
CALL sp_consultar_saldo_vacaciones(1);

-- Vista empleados
SELECT * FROM VistaEmpleados LIMIT 10;

-- Consulta CTE solicitudes
-- (ver database/advanced_queries.sql Q8)
```

---

*Generado para HumanLink · MySQL 8 · Compatible con Prisma migrate.*
