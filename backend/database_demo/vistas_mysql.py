#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Archivo académico: VISTAS MySQL.

Fuente: database/views_mysql.sql

HumanLink real: Next.js -> Prisma -> MySQL (consultas vía Prisma)
Este script: Python -> SELECT vista -> MySQL ejecuta la definición almacenada
"""

# Permite anotaciones de tipo con referencias forward (compatibilidad Python 3.7+).
from __future__ import annotations

# Excepción específica del conector mysql-connector-python para errores de protocolo/SQL.
from mysql.connector import Error as MySQLError

# Utilidades compartidas del paquete database_demo:
# - ENCABEZADO_ACADEMICO: banner impreso al iniciar el menú.
# - conectar(): abre MySQLConnection usando credenciales de .env.
# - ejecutar_select(): envía un SELECT, obtiene filas y las imprime formateadas.
# - fetchone_dict(): convierte la fila del cursor en dict {nombre_columna: valor}.
# - leer_texto(): captura entrada del usuario con prompt.
# - mensaje_mysql(): normaliza el texto de Error de MySQL para consola.
from db_utils import (
    ENCABEZADO_ACADEMICO,
    conectar,
    ejecutar_select,
    fetchone_dict,
    leer_texto,
    mensaje_mysql,
)


# ============================================================
# VISTA — VistaQuejas (RF-H16 · Quejas laborales)
#
# Definición almacenada en MySQL (database/views_mysql.sql):
#   CREATE OR REPLACE VIEW VistaQuejas AS
#   SELECT q.id, q.asunto, q.estado, q.createdAt AS fechaRegistro,
#          DATEDIFF(CURDATE(), DATE(q.createdAt)) AS diasAntiguedad,
#          CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
#          d.nombre AS departamento,
#          (SELECT COUNT(*) FROM QuejaHistorial qh WHERE qh.quejaId = q.id)
#            AS movimientosHistorial
#   FROM QuejaLaboral q
#   INNER JOIN Empleado e ON e.id = q.empleadoId
#   LEFT JOIN Departamento d ON d.id = e.departamentoId;
#
# Columnas expuestas por la vista:
#   id, asunto, estado, fechaRegistro, diasAntiguedad, empleado,
#   departamento, movimientosHistorial.
#
# Cálculos que ejecuta MySQL internamente (Python no los replica):
#   - DATEDIFF entre la fecha actual y la fecha de registro de la queja.
#   - Subconsulta correlacionada COUNT sobre QuejaHistorial por quejaId.
#   - CONCAT del nombre del empleado reportante.
#   - JOIN con Empleado (INNER) y Departamento (LEFT).
#
# Flujo de ejecución:
#   Python -> SELECT * FROM VistaQuejas LIMIT n
#          -> MySQL resuelve la definición de la vista
#          -> devuelve filas ya proyectadas y calculadas
#          -> ejecutar_select() imprime el resultado en consola.
#
# Parámetro limite (int, default 15): tope de filas; se castea a int antes del SQL.
# Retorno: None — la salida ocurre vía ejecutar_select() en stdout.
# ============================================================
def consultar_vista_quejas(limite: int = 15) -> None:
    # Se envía un SELECT a MySQL sobre la vista ya existente.
    # Python no construye la vista ni reproduce sus JOIN.
    # La definición de VistaQuejas pertenece a MySQL.
    # ejecutar_select() abre conexión, ejecuta el SQL, imprime columnas/filas y cierra.
    ejecutar_select(f"SELECT * FROM VistaQuejas LIMIT {int(limite)}")


# ============================================================
# VISTA — VistaEventos (RF-H17 · Eventos organizacionales)
#
# Definición almacenada en MySQL (database/views_mysql.sql):
#   CREATE OR REPLACE VIEW VistaEventos AS
#   SELECT ev.id, ev.titulo, ev.fecha, ev.ubicacion, ev.inscripcionAbierta,
#          ev.activo,
#          COUNT(er.id) AS totalRespuestas,
#          SUM(CASE WHEN er.respuesta = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmados,
#          SUM(CASE WHEN er.respuesta = 'RECHAZADO' THEN 1 ELSE 0 END) AS rechazados,
#          SUM(CASE WHEN er.respuesta = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes
#   FROM EventoOrganizacional ev
#   LEFT JOIN EventoRespuesta er ON er.eventoId = ev.id
#   GROUP BY ev.id, ev.titulo, ev.fecha, ev.ubicacion,
#            ev.inscripcionAbierta, ev.activo;
#
# Columnas expuestas por la vista:
#   id, titulo, fecha, ubicacion, inscripcionAbierta, activo,
#   totalRespuestas, confirmados, rechazados, pendientes.
#
# Agregaciones calculadas en el motor MySQL (no en Python):
#   - COUNT(er.id) para total de respuestas recibidas por evento.
#   - SUM(CASE ...) condicionales para desglosar confirmados, rechazados y pendientes.
#   - GROUP BY sobre atributos del evento para consolidar una fila por evento.
#
# Flujo de ejecución:
#   Python -> SELECT * FROM VistaEventos LIMIT n -> MySQL -> resultado agregado.
#
# Parámetro limite (int, default 15): tope de filas devueltas.
# Retorno: None — salida impresa por ejecutar_select().
# ============================================================
def consultar_vista_eventos(limite: int = 15) -> None:
    # Se envía un SELECT a MySQL sobre la vista ya existente.
    # Python no construye la vista ni reproduce sus JOIN.
    # La definición de VistaEventos pertenece a MySQL.
    # El LIMIT restringe filas devueltas sin modificar la definición de la vista.
    ejecutar_select(f"SELECT * FROM VistaEventos LIMIT {int(limite)}")


# ============================================================
# VISTA — VistaCapacitaciones (RF-H05 · Capacitaciones)
#
# Definición almacenada en MySQL (database/views_mysql.sql):
#   CREATE OR REPLACE VIEW VistaCapacitaciones AS
#   SELECT c.id, c.nombre, c.instructor, c.fechaInicio, c.fechaFin,
#          c.cupoMaximo, c.estado,
#          COUNT(ce.id) AS inscritos,
#          (c.cupoMaximo - COUNT(ce.id)) AS lugaresDisponibles,
#          CASE
#            WHEN COUNT(ce.id) >= c.cupoMaximo THEN 'LLENO'
#            WHEN COUNT(ce.id) >= c.cupoMaximo * 0.8 THEN 'CASI_LLENO'
#            ELSE 'DISPONIBLE'
#          END AS estadoCupo
#   FROM Capacitacion c
#   LEFT JOIN CapacitacionEmpleado ce ON ce.capacitacionId = c.id
#   GROUP BY c.id, c.nombre, c.instructor, c.fechaInicio, c.fechaFin,
#            c.cupoMaximo, c.estado;
#
# Columnas expuestas por la vista:
#   id, nombre, instructor, fechaInicio, fechaFin, cupoMaximo, estado,
#   inscritos, lugaresDisponibles, estadoCupo.
#
# Cálculos internos de MySQL:
#   - COUNT(ce.id) sobre inscripciones vinculadas (CapacitacionEmpleado).
#   - Resta aritmética cupoMaximo - inscritos -> lugaresDisponibles.
#   - CASE evalúa umbral 80% y cupo completo -> estadoCupo (LLENO/CASI_LLENO/DISPONIBLE).
#
# Flujo de ejecución:
#   Python -> SELECT * FROM VistaCapacitaciones LIMIT n -> MySQL -> filas con cupo calculado.
#
# Parámetro limite (int, default 15): cantidad máxima de capacitaciones listadas.
# Retorno: None — inscritos, lugaresDisponibles y estadoCupo vienen de MySQL, no de Python.
# ============================================================
def consultar_vista_capacitaciones(limite: int = 15) -> None:
    # Se envía un SELECT a MySQL sobre la vista ya existente.
    # Python no construye la vista ni reproduce sus JOIN.
    # La definición de VistaCapacitaciones pertenece a MySQL.
    # int(limite) garantiza un entero seguro en la cláusula LIMIT del SELECT.
    ejecutar_select(f"SELECT * FROM VistaCapacitaciones LIMIT {int(limite)}")


# ============================================================
# VISTA — VistaVacantesAbiertas (RF-H03 · Vacantes abiertas)
#
# Definición almacenada en MySQL (database/views_mysql.sql):
#   CREATE OR REPLACE VIEW VistaVacantesAbiertas AS
#   SELECT v.id, v.titulo, v.estado, v.cupoTotal, v.cupoDisponible,
#          v.cupoBloqueado, v.modalidad, v.ubicacion, v.fechaPublicacion,
#          d.nombre AS departamento, o.nombre AS organizacion,
#          (SELECT COUNT(*) FROM Candidato c WHERE c.vacanteId = v.id) AS totalCandidatos
#   FROM Vacante v
#   INNER JOIN Departamento d ON d.id = v.departamentoId
#   INNER JOIN Organizacion o ON o.id = d.organizacionId
#   WHERE v.estado = 'ABIERTA';
#
# Columnas expuestas por la vista:
#   id, titulo, estado, cupoTotal, cupoDisponible, cupoBloqueado, modalidad,
#   ubicacion, fechaPublicacion, departamento, organizacion, totalCandidatos.
#
# Filtros y joins resueltos en MySQL:
#   - WHERE v.estado = 'ABIERTA' excluye vacantes cerradas o en otros estados.
#   - INNER JOIN con Departamento y Organizacion para contexto organizacional.
#   - Subconsulta COUNT de Candidato por vacanteId -> totalCandidatos.
#
# Flujo de ejecución:
#   Python -> SELECT * FROM VistaVacantesAbiertas LIMIT n -> MySQL -> vacantes filtradas.
#
# Parámetro limite (int, default 15): tope de vacantes devueltas.
# Retorno: None — el filtro estado = 'ABIERTA' está embebido en la vista MySQL.
# ============================================================
def consultar_vista_vacantes_abiertas(limite: int = 15) -> None:
    # Se envía un SELECT a MySQL sobre la vista ya existente.
    # Python no construye la vista ni reproduce sus JOIN.
    # La definición de VistaVacantesAbiertas pertenece a MySQL.
    # SELECT * proyecta todas las columnas definidas en la vista (incluye totalCandidatos).
    ejecutar_select(f"SELECT * FROM VistaVacantesAbiertas LIMIT {int(limite)}")


# ============================================================
# VISTA — VistaAsistencias (RF-H06 · Asistencias del mes actual)
#
# Definición almacenada en MySQL (database/views_mysql.sql):
#   CREATE OR REPLACE VIEW VistaAsistencias AS
#   SELECT a.id, a.fecha, a.horaEntrada, a.horaSalida, a.estado, a.turnoNombre,
#          e.numeroEmpleado,
#          CONCAT(e.nombre, ' ', e.apellidoPaterno) AS empleado,
#          d.nombre AS departamento
#   FROM Asistencia a
#   INNER JOIN Empleado e ON e.id = a.empleadoId
#   LEFT JOIN Departamento d ON d.id = e.departamentoId
#   WHERE a.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01');
#
# Columnas expuestas por la vista:
#   id, fecha, horaEntrada, horaSalida, estado, turnoNombre,
#   numeroEmpleado, empleado, departamento.
#
# Lógica temporal aplicada en MySQL:
#   - DATE_FORMAT(CURDATE(), '%Y-%m-01') obtiene el primer día del mes en curso.
#   - WHERE a.fecha >= ... restringe asistencias al mes actual (evaluado en cada consulta).
#   - JOIN Empleado (INNER) y Departamento (LEFT) enriquecen cada registro de asistencia.
#
# Flujo de ejecución:
#   Python -> SELECT * FROM VistaAsistencias LIMIT n -> MySQL -> asistencias del mes.
#
# Parámetro limite (int, default 15): cantidad máxima de registros de asistencia.
# Retorno: None — el corte mensual (fecha >= primer día del mes) lo aplica MySQL.
# ============================================================
def consultar_vista_asistencias(limite: int = 15) -> None:
    # Se envía un SELECT a MySQL sobre la vista ya existente.
    # Python no construye la vista ni reproduce sus JOIN.
    # La definición de VistaAsistencias pertenece a MySQL.
    # CURDATE() dentro de la vista se evalúa en el servidor en el momento del SELECT.
    ejecutar_select(f"SELECT * FROM VistaAsistencias LIMIT {int(limite)}")


def mostrar_codigo_vista(nombre: str) -> None:
    """SHOW CREATE VIEW — definición almacenada en MySQL (solo lectura)."""
    # conn: instancia MySQLConnection obtenida de conectar() (host, puerto, BD humanlink).
    conn = conectar()
    # try/finally garantiza cierre de conexión aunque falle la consulta o no exista la vista.
    try:
        # human: cursor estándar del conector; canal para enviar SQL al servidor y leer metadatos.
        human = conn.cursor()
        # Metadatos de la operación SHOW CREATE VIEW:
        #   - Comando DDL de inspección (solo lectura); no modifica esquema ni datos.
        #   - Devuelve una fila con columnas típicas: View, Create View, character_set_client, etc.
        #   - El campo "Create View" contiene el texto SQL completo de CREATE VIEW ... AS SELECT ...
        #   - Permite verificar JOIN, WHERE, GROUP BY y expresiones definidas en el servidor.
        #   - `nombre` se interpola entre backticks para escapar identificadores con caracteres especiales.
        human.execute(f"SHOW CREATE VIEW `{nombre}`")
        # fetchone_dict convierte la tupla del cursor en dict indexado por nombre de columna.
        row = fetchone_dict(human)
        # Si la vista no existe o el servidor no devolvió filas, informar y salir sin excepción.
        if not row:
            print(f"Vista `{nombre}` no encontrada.")
            return
        # Extraer la definición SQL: clave "Create View" en MySQL 8; fallback a row entero si cambia el formato.
        sql = row.get("Create View") or row
        # Imprimir encabezado con nombre de vista y el DDL recuperado del diccionario de datos de MySQL.
        print(f"\n=== {nombre} ===\n{sql}")
    # Captura errores del protocolo MySQL (vista inexistente, permisos, sintaxis en identificador).
    except MySQLError as err:
        print(f"Error: {mensaje_mysql(err)}")
    # finally: liberar recursos de red/sesión independientemente del resultado del try/except.
    finally:
        # conn.close(): cierra socket TCP y libera la conexión en el pool del conector.
        conn.close()


def menu() -> None:
    # Imprime banner de contexto HumanLink + explicación de integración Python/MySQL.
    print(ENCABEZADO_ACADEMICO)
    # Bucle principal: permanece activo hasta que el usuario elija opción "0".
    while True:
        print("\n--- Vistas MySQL ---")
        print("1. VistaQuejas")
        print("2. VistaEventos")
        print("3. VistaCapacitaciones")
        print("4. VistaVacantesAbiertas")
        print("5. VistaAsistencias")
        print("6. Mostrar código de vista (SHOW CREATE VIEW)")
        print("0. Volver")
        # Captura opción del usuario; strip() elimina espacios accidentalmente ingresados.
        op = input("\nOpción: ").strip()
        # Salir del menú y regresar al script invocador (main o módulo padre).
        if op == "0":
            break
        # RF-H16: consultar quejas laborales con antigüedad e historial agregado.
        elif op == "1":
            consultar_vista_quejas()
        # RF-H17: consultar eventos con totales de confirmación/rechazo/pendiente.
        elif op == "2":
            consultar_vista_eventos()
        # RF-H05: consultar capacitaciones con cupo, inscritos y estadoCupo.
        elif op == "3":
            consultar_vista_capacitaciones()
        # RF-H03: consultar vacantes filtradas a estado ABIERTA.
        elif op == "4":
            consultar_vista_vacantes_abiertas()
        # RF-H06: consultar asistencias del mes actual con datos de empleado.
        elif op == "5":
            consultar_vista_asistencias()
        # Inspección DDL: solicita nombre de vista y ejecuta SHOW CREATE VIEW.
        elif op == "6":
            mostrar_codigo_vista(leer_texto("Nombre de la vista: "))
        # Entrada no reconocida: reiterar menú en la siguiente iteración del while.
        else:
            print("Opción no válida.")


# Punto de entrada cuando el archivo se ejecuta directamente (python vistas_mysql.py).
if __name__ == "__main__":
    menu()
