# HumanLink — Bases de Datos Avanzadas (demostración Python)

Este directorio contiene scripts Python **independientes** para la materia **Bases de Datos Avanzadas**. Sirven únicamente como evidencia en clase: muestran de forma directa la interacción **Python → SQL → MySQL → Resultado**.

> **HumanLink en operación real:** Next.js → Prisma → MySQL  
> **Estos scripts:** Python → SQL → MySQL (sin Prisma, sin Next.js)

No modifican ni sustituyen la aplicación principal.

---

## Propósito del directorio

| Objetivo | Descripción |
|----------|-------------|
| Triggers | Provocar INSERT/UPDATE y dejar que MySQL ejecute el trigger automáticamente |
| Procedimientos | `CALL sp_*` sobre procedimientos ya definidos en MySQL |
| Vistas | `SELECT * FROM Vista*` y `SHOW CREATE VIEW` |
| Consultas avanzadas | Q1–Q12 leídas desde `database/advanced_queries.sql` |
| Índices | `SHOW INDEX` e `information_schema.STATISTICS` |
| Campos calculados | Consultas de solo lectura con fórmulas documentadas |
| Info MySQL | `VERSION()`, tablas, triggers, SP y vistas instalados |

---

## Requisitos

- Python 3.10+
- MySQL 8+ o MariaDB 10.4+ con base `humanlink`
- Objetos SQL académicos instalados (sin modificar los archivos `.sql`):

```powershell
mysql -u humanlink -p humanlink < database\triggers_mysql.sql
mysql -u humanlink -p humanlink < database\procedures_mysql.sql
mysql -u humanlink -p humanlink < database\views_mysql.sql
```

Las consultas avanzadas, índices y campos calculados usan tablas y funciones ya presentes en el schema Prisma/migraciones.

---

## Instalación

```powershell
pip install mysql-connector-python python-dotenv
```

O con el venv del backend (solo entorno Python, **no ejecutar Django**):

```powershell
cd backend
venv\Scripts\activate
pip install mysql-connector-python python-dotenv
```

---

## Configuración de conexión MySQL

Copie `.env.example` a `.env` en la raíz del proyecto.

| Variable | Alternativa |
|----------|-------------|
| `DB_HOST` | `MYSQL_HOST` o host de `DATABASE_URL` |
| `DB_PORT` | `MYSQL_PORT` |
| `DB_NAME` | `MYSQL_DATABASE` |
| `DB_USER` | `MYSQL_USER` o usuario de `DATABASE_URL` |
| `DB_PASSWORD` | `MYSQL_PASSWORD` o contraseña de `DATABASE_URL` |

Ejemplo:

```env
DATABASE_URL="mysql://humanlink:TU_CLAVE@localhost:3306/humanlink"
```

No hay contraseñas hardcodeadas en los scripts.

---

## Ejecución del menú principal

Desde la raíz del repositorio:

```powershell
python backend/database_demo/main.py
```

Menú:

```
============================================================
HumanLink — Bases de Datos Avanzadas
============================================================

1. Triggers
2. Procedimientos almacenados
3. Vistas
4. Consultas avanzadas
5. Índices
6. Campos calculados
7. Información general MySQL
0. Salir
```

También puede ejecutar cada módulo por separado:

```powershell
python backend/database_demo/triggers_mysql.py
python backend/database_demo/procedimientos_mysql.py
python backend/database_demo/vistas_mysql.py
python backend/database_demo/consultas_avanzadas.py
python backend/database_demo/indices_mysql.py
python backend/database_demo/campos_calculados.py
python backend/database_demo/informacion_bd.py
```

---

## Archivos y función de cada uno

| Archivo | Función |
|---------|---------|
| `main.py` | Menú principal que delega a cada módulo |
| `db_utils.py` | Conexión `.env`, helpers SQL, confirmación COMMIT/ROLLBACK |
| `triggers_mysql.py` | Evidencia de 4 triggers obligatorios + SP relacionados |
| `procedimientos_mysql.py` | 12 procedimientos con `CALL` |
| `vistas_mysql.py` | 5 vistas + `SHOW CREATE VIEW` |
| `consultas_avanzadas.py` | Q1–Q12 desde `database/advanced_queries.sql` |
| `indices_mysql.py` | `SHOW INDEX` e `information_schema` |
| `campos_calculados.py` | Fórmulas de solo lectura (LFT, saldo, DATEDIFF, etc.) |
| `informacion_bd.py` | Metadatos del servidor MySQL |

**Nota:** La carpeta `database_demo/` se conserva porque está registrada como app Django (`apps.py`). No se renombró a `database_tools/` para evitar cambios estructurales innecesarios.

---

## Triggers demostrables

| Trigger | Archivo | Operación que lo dispara |
|---------|---------|--------------------------|
| `trg_capacitacion_valida_cupo` | `triggers_mysql.py` | `INSERT CapacitacionEmpleado` |
| `trg_candidato_postulacion_unica` | `triggers_mysql.py` | `INSERT Candidato` |
| `trg_solicitud_validar_saldo_vacaciones` | `triggers_mysql.py` | `UPDATE SolicitudPermiso` → APROBADA |
| `trg_solicitud_descontar_vacaciones` | `triggers_mysql.py` | `CALL sp_aprobar_vacaciones` (AFTER UPDATE) |

Flujo pedagógico: **Python envía SQL → MySQL ejecuta trigger → resultado o SIGNAL 45000**.

---

## Procedimientos (`procedimientos_mysql.py`)

- `sp_registrar_empleado`
- `sp_crear_vacante`
- `sp_aprobar_vacaciones`
- `sp_registrar_asistencia`
- `sp_contratar_candidato`
- `sp_registrar_documento`
- `sp_generar_reporte_empleados_depto`
- `sp_registrar_capacitacion`
- `sp_actualizar_departamento`
- `sp_registrar_evento`
- `sp_inscribir_capacitacion`
- `sp_consultar_saldo_vacaciones`

Los que modifican datos piden confirmación **S/N** y permiten **COMMIT** o **ROLLBACK**.

---

## Vistas (`vistas_mysql.py`)

- `VistaQuejas`
- `VistaEventos`
- `VistaCapacitaciones`
- `VistaVacantesAbiertas`
- `VistaAsistencias`

Incluye `mostrar_codigo_vista(nombre)` con `SHOW CREATE VIEW`.

---

## Consultas avanzadas Q1–Q12 (`consultas_avanzadas.py`)

| ID | Tema | Técnicas |
|----|------|----------|
| Q1 | Empleados activos por depto | INNER JOIN |
| Q2 | Vacantes abiertas con candidatos | INNER/LEFT JOIN, GROUP BY |
| Q3 | Turnos con o sin empleados | RIGHT JOIN |
| Q4 | Deptos con >2 empleados | GROUP BY, HAVING |
| Q5 | Resumen mensual asistencias | CASE, SUM, COUNT |
| Q6 | Estadísticas evaluaciones | AVG, MIN, MAX, HAVING |
| Q7 | Candidatos en vacantes sin cupo | Subconsulta |
| Q8 | Solicitudes pendientes y saldo | CTE, LEFT JOIN, LFT |
| Q9 | Ranking de retardos | Subconsulta, RANK() |
| Q10 | Porcentaje pipeline | CTE, ventana |
| Q11 | Documentos próximos a vencer | DATEDIFF |
| Q12 | Quejas antiguas abiertas | DATEDIFF, estado |

El SQL se carga desde `database/advanced_queries.sql` — no se inventan consultas nuevas.

---

## Índices (`indices_mysql.py`)

Tablas predefinidas: `Empleado`, `CapacitacionEmpleado`, `SolicitudPermiso`, `Candidato`, `CalculoLaboralInfo`.

También `mostrar_indices(tabla)` para cualquier tabla y consulta a `information_schema.STATISTICS`.

Leyenda en pantalla: **PK**, **FK**, **UNIQUE**, **INDEX**.

---

## Campos calculados (`campos_calculados.py`)

| Demostración | Fórmula / campo |
|--------------|-----------------|
| Días vacaciones LFT | `fn_dias_vacaciones_lft(fechaIngreso)` |
| Saldo | `CalculoLaboralInfo.diasVacaciones` (físico) |
| Días solicitados | `DATEDIFF(fechaFin, fechaInicio) + 1` |
| Estado asistencia | `Asistencia.estado` |
| Cupo capacitación | `cupoMaximo - COUNT(inscripciones)` |
| Antigüedad quejas | `DATEDIFF(CURDATE(), createdAt)` |
| Confirmaciones eventos | `SUM(CASE WHEN respuesta='CONFIRMADO' ...)` |

Referencia documental: `database/calculated_fields.md`.

---

## Capturas sugeridas para el documento

1. **Menú principal** (`main.py`) — contexto de la suite.
2. **Trigger cupo** — INSERT rechazado con mensaje SIGNAL visible.
3. **`SHOW CREATE TRIGGER trg_*`** — código en MySQL vs operación Python.
4. **`CALL sp_consultar_saldo_vacaciones`** — salida del procedimiento.
5. **`SELECT * FROM VistaCapacitaciones`** — filas con `lugaresDisponibles`.
6. **Q8 o Q9** — consulta avanzada con CTE/ventana en consola.
7. **`SHOW INDEX FROM Empleado`** — PK e índices secundarios.
8. **`fn_dias_vacaciones_lft`** — comparación con saldo en `CalculoLaboralInfo`.
9. **`SHOW TRIGGERS FROM humanlink`** — inventario completo en `informacion_bd.py`.

Incluya en cada captura: terminal Python, SQL ejecutado (impreso por el script) y resultado MySQL.

---

## Seguridad en demostraciones

- Operaciones de **solo lectura** (vistas, Q1–Q12, índices, campos calculados, info MySQL) se ejecutan directamente.
- Operaciones que **modifican datos** (triggers, SP de escritura) requieren confirmación y ofrecen **ROLLBACK** al finalizar la clase.

---

## Confirmación de alcance

| Elemento | ¿Modificado por estos scripts? |
|----------|-------------------------------|
| HumanLink principal (`src/`) | **NO** |
| Next.js / Prisma | **NO** |
| Schema MySQL / migraciones | **NO** |
| `database/*.sql` académicos | **NO** |
| RF-H01 a RF-H20 | **NO** |
| Python como herramienta académica | **SÍ** |
