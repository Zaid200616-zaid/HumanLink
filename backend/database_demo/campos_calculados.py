#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Archivo académico: CAMPOS CALCULADOS.

Referencia documental: database/calculated_fields.md
Consultas de solo lectura — NO modifica datos.

HumanLink real: cálculos en src/lib/vacaciones.ts, triggers y vistas
Este script: ejecuta fórmulas SQL en MySQL para evidencia directa
"""

from __future__ import annotations

from db_utils import ENCABEZADO_ACADEMICO, ejecutar_select, leer_entero


# ============================================================
# Campo calculado: días de vacaciones anuales (LFT)
# Tabla: Empleado.fechaIngreso
# Fórmula: fn_dias_vacaciones_lft(fechaIngreso)
# Tipo: calculado en MySQL (función almacenada)
# RF: RF-H13
# ============================================================
def demo_dias_vacaciones_lft(limite: int = 10) -> None:
    sql = """
        SELECT id, numeroEmpleado, nombre, apellidoPaterno, fechaIngreso,
               fn_dias_vacaciones_lft(DATE(fechaIngreso)) AS diasAnualesLFT
          FROM Empleado
         WHERE activo = 1
         LIMIT %s
    """
    print("\nFórmula MySQL: fn_dias_vacaciones_lft(fechaIngreso)")
    ejecutar_select(sql, (limite,))


# ============================================================
# Campo: saldo persistido CalculoLaboralInfo.diasVacaciones
# Tipo: físico (actualizado por trigger trg_solicitud_descontar_vacaciones)
# ============================================================
def demo_saldo_calculo_laboral(empleado_id: int | None = None) -> None:
    if empleado_id:
        sql = """
            SELECT e.id, e.numeroEmpleado,
                   CONCAT(e.nombre,' ',e.apellidoPaterno) AS empleado,
                   cli.diasVacaciones, cli.notas, cli.updatedAt
              FROM Empleado e
              LEFT JOIN CalculoLaboralInfo cli ON cli.empleadoId = e.id
             WHERE e.id = %s
        """
        ejecutar_select(sql, (empleado_id,))
    else:
        sql = """
            SELECT e.id, e.numeroEmpleado, cli.diasVacaciones, cli.updatedAt
              FROM CalculoLaboralInfo cli
              JOIN Empleado e ON e.id = cli.empleadoId
             LIMIT 15
        """
        ejecutar_select(sql)


# ============================================================
# Días solicitados — SolicitudPermiso
# Fórmula referencia: diasSolicitados / DATEDIFF(fechaFin, fechaInicio)+1
# ============================================================
def demo_dias_solicitados(limite: int = 10) -> None:
    sql = """
        SELECT id, empleadoId, tipo, estado, diasSolicitados,
               fechaInicio, fechaFin,
               DATEDIFF(fechaFin, fechaInicio) + 1 AS diasCalendario
          FROM SolicitudPermiso
         ORDER BY id DESC
         LIMIT %s
    """
    print("\nComparación: diasSolicitados (campo) vs DATEDIFF+1 (referencia calendario)")
    ejecutar_select(sql, (limite,))


# ============================================================
# Estado asistencia — Asistencia.estado (clasificado por trigger trg_asistencia_clasifica)
# ============================================================
def demo_estado_asistencia(limite: int = 10) -> None:
    sql = """
        SELECT a.id, a.fecha, a.horaEntrada, a.horaSalida, a.estado,
               e.numeroEmpleado
          FROM Asistencia a
          JOIN Empleado e ON e.id = a.empleadoId
         ORDER BY a.fecha DESC
         LIMIT %s
    """
    print("\nCampo físico: Asistencia.estado (PUNTUAL, RETARDO, FALTA, ...)")
    ejecutar_select(sql, (limite,))


# ============================================================
# Lugares disponibles capacitación — VistaCapacitaciones / fórmula cupoMaximo - COUNT
# ============================================================
def demo_lugares_capacitacion() -> None:
    sql = """
        SELECT c.id, c.nombre, c.cupoMaximo,
               COUNT(ce.id) AS inscritos,
               (c.cupoMaximo - COUNT(ce.id)) AS lugaresDisponibles
          FROM Capacitacion c
          LEFT JOIN CapacitacionEmpleado ce ON ce.capacitacionId = c.id
         GROUP BY c.id, c.nombre, c.cupoMaximo
    """
    print("\nFórmula: cupoMaximo - COUNT(inscripciones) — misma lógica que VistaCapacitaciones")
    ejecutar_select(sql)


# ============================================================
# Antigüedad quejas — DATEDIFF(CURDATE(), createdAt)
# ============================================================
def demo_antiguedad_quejas() -> None:
    sql = """
        SELECT id, asunto, estado, createdAt,
               DATEDIFF(CURDATE(), DATE(createdAt)) AS diasAntiguedad
          FROM QuejaLaboral
         ORDER BY diasAntiguedad DESC
         LIMIT 15
    """
    print("\nFórmula: DATEDIFF(CURDATE(), DATE(createdAt)) — igual que VistaQuejas")
    ejecutar_select(sql)


# ============================================================
# Confirmaciones eventos — SUM(CASE WHEN respuesta='CONFIRMADO' ...)
# ============================================================
def demo_confirmaciones_eventos() -> None:
    sql = """
        SELECT ev.id, ev.titulo,
               COUNT(er.id) AS totalRespuestas,
               SUM(CASE WHEN er.respuesta = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmados,
               SUM(CASE WHEN er.respuesta = 'RECHAZADO' THEN 1 ELSE 0 END) AS rechazados
          FROM EventoOrganizacional ev
          LEFT JOIN EventoRespuesta er ON er.eventoId = ev.id
         GROUP BY ev.id, ev.titulo
    """
    print("\nFórmula: SUM(CASE...) — misma lógica que VistaEventos")
    ejecutar_select(sql)


def menu() -> None:
    print(ENCABEZADO_ACADEMICO)
    while True:
        print("\n--- Campos calculados ---")
        print("1. Días vacaciones LFT (fn_dias_vacaciones_lft)")
        print("2. Saldo CalculoLaboralInfo.diasVacaciones")
        print("3. Días solicitados vs DATEDIFF")
        print("4. Estado de asistencia (Asistencia.estado)")
        print("5. Lugares disponibles en capacitación")
        print("6. Antigüedad de quejas (DATEDIFF)")
        print("7. Confirmaciones de eventos (SUM/CASE)")
        print("0. Volver")
        op = input("\nOpción: ").strip()
        if op == "0":
            break
        elif op == "1":
            demo_dias_vacaciones_lft()
        elif op == "2":
            emp = input("empleadoId (Enter=todos): ").strip()
            demo_saldo_calculo_laboral(int(emp) if emp else None)
        elif op == "3":
            demo_dias_solicitados()
        elif op == "4":
            demo_estado_asistencia()
        elif op == "5":
            demo_lugares_capacitacion()
        elif op == "6":
            demo_antiguedad_quejas()
        elif op == "7":
            demo_confirmaciones_eventos()
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    menu()
