#!/usr/bin/env python3
"""
HumanLink — Bases de Datos Avanzadas

Archivo académico: PROCEDIMIENTOS ALMACENADOS.

Fuente de definiciones: database/procedures_mysql.sql

HumanLink real: Next.js -> Prisma -> MySQL
Este script: Python -> CALL -> MySQL -> Stored Procedure -> Resultado
"""

from __future__ import annotations

from db_utils import ENCABEZADO_ACADEMICO, ejecutar_call, leer_entero, leer_texto


# ============================================================
# FUNCIÓN WRAPPER — sp_consultar_saldo_vacaciones
#
# Procedimiento MySQL (database/procedures_mysql.sql):
#   sp_consultar_saldo_vacaciones(IN p_empleadoId INT)
#
# Parámetro de entrada:
#   empleado_id — recibido desde menu() vía leer_entero(); no se
#   captura dentro de esta función.
#
# Consecuencia en MySQL:
#   Solo lectura. El SP calcula días LFT (fn_dias_vacaciones_lft),
#   suma solicitudes APROBADAS y PENDIENTES de tipo VACACION, y
#   devuelve un result set con saldo disponible. No INSERT ni UPDATE.
#   muta_datos=False evita confirmación COMMIT/ROLLBACK innecesaria.
#
# Flujo:
#   Python -> CALL sp_consultar_saldo_vacaciones -> SELECT interno -> filas
# ============================================================
def ejecutar_sp_consultar_saldo_vacaciones(empleado_id: int) -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_consultar_saldo_vacaciones
    # ========================================================
    # ejecutar_call() abre conexión, inicia transacción y envía CALL a MySQL.
    # MySQL ejecuta el cuerpo del SP: consulta Empleado, SolicitudPermiso y
    # la función fn_dias_vacaciones_lft. Devuelve columnas de saldo (días LFT,
    # extra, usados, pendientes, disponibles). Python recupera el result set
    # mediante fetchall_dict dentro de db_utils.ejecutar_call.
    # No se disparan triggers: no hay INSERT ni UPDATE sobre tablas base.
    ejecutar_call(
        "CALL sp_consultar_saldo_vacaciones(%s)",
        (empleado_id,),
        muta_datos=False,
        descripcion="SP: sp_consultar_saldo_vacaciones (RF-H13) — solo lectura",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_generar_reporte_empleados_depto
#
# Parámetros:
#   usuario_id — quien genera el reporte (HistorialReporte.usuarioId)
#   mes        — periodo YYYY-MM del reporte
#
# Consecuencia en MySQL:
#   INSERT en HistorialReporte (tipo EMPLEADOS_POR_DEPARTAMENTO).
#   Luego SELECT con LEFT JOIN Departamento/Empleado agrupado por departamento.
#   No dispara triggers de negocio sobre SolicitudPermiso ni CapacitacionEmpleado.
# ============================================================
def ejecutar_sp_generar_reporte_empleados_depto(usuario_id: int, mes: str) -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_generar_reporte_empleados_depto
    # ========================================================
    # MySQL inserta una fila en HistorialReporte y ejecuta la consulta agregada
    # de empleados activos por departamento. El INSERT persiste el registro del
    # reporte; el SELECT posterior es solo lectura dentro del mismo CALL.
    # Si el usuario elige ROLLBACK en ejecutar_call, se revierte el INSERT.
    ejecutar_call(
        "CALL sp_generar_reporte_empleados_depto(%s, %s)",
        (usuario_id, mes),
        muta_datos=True,
        descripcion="SP: sp_generar_reporte_empleados_depto (RF-H08) — modifica HistorialReporte",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_registrar_empleado (RF-H02)
#
# Recolección de parámetros:
#   Cada leer_texto() / leer_entero() solicita al operador un valor por stdin.
#   Los valores se almacenan en variables locales antes del CALL.
#   puesto se lee dentro de la tupla del CALL (último parámetro antes de dept/turno).
#
# Consecuencia en MySQL:
#   INSERT en Empleado con activo=1 y updatedAt=NOW(3).
#   Puede disparar AFTER INSERT/UPDATE en Empleado si existen triggers de auditoría,
#   pero el SP en sí solo realiza el INSERT y devuelve LAST_INSERT_ID().
# ============================================================
def ejecutar_sp_registrar_empleado() -> None:
    # Captura secuencial de datos del nuevo empleado desde consola.
    numero = leer_texto("numeroEmpleado: ")
    nombre = leer_texto("nombre: ")
    ap = leer_texto("apellidoPaterno: ")
    email = leer_texto("email: ")
    dept = leer_entero("departamentoId: ")
    turno = leer_entero("turnoId: ")
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_registrar_empleado
    # ========================================================
    # MySQL recibe ocho parámetros IN (incluido NOW(3) como fechaIngreso fijada
    # en el SQL del CALL). El SP inserta en Empleado y retorna empleadoId.
    # muta_datos=True activa confirmación COMMIT/ROLLBACK antes de persistir.
    ejecutar_call(
        "CALL sp_registrar_empleado(%s, %s, %s, %s, NOW(3), %s, %s, %s)",
        (numero, nombre, ap, email, leer_texto("puesto: "), dept, turno),
        muta_datos=True,
        descripcion="SP: sp_registrar_empleado — INSERT en Empleado",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_crear_vacante (RF-H03)
#
# Parámetros capturados inline en la tupla del CALL mediante leer_texto/leer_entero.
# Consecuencia en MySQL: INSERT en Vacante con cupoDisponible=cupoTotal, estado ABIERTA.
# ============================================================
def ejecutar_sp_crear_vacante() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_crear_vacante
    # ========================================================
    # leer_texto/leer_entero se evalúan al construir la tupla de parámetros.
    # MySQL inserta la vacante y devuelve vacanteId vía SELECT LAST_INSERT_ID().
    ejecutar_call(
        "CALL sp_crear_vacante(%s, %s, %s, %s)",
        (
            leer_texto("titulo: "),
            leer_texto("descripcion: "),
            leer_entero("departamentoId: "),
            leer_entero("cupoTotal: "),
        ),
        muta_datos=True,
        descripcion="SP: sp_crear_vacante (RF-H03)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_aprobar_vacaciones (RF-H13)
#
# Recolección de parámetros:
#   solicitudId      — PK de SolicitudPermiso (debe ser VACACION + PENDIENTE)
#   aprobadoPorId    — empleado de RH que aprueba
#   respuesta        — texto de resolución (default en leer_texto si Enter vacío)
#
# Consecuencia en MySQL (cadena completa tras el CALL):
#
#   1) El SP ejecuta UPDATE SolicitudPermiso SET estado='APROBADA', ...
#      WHERE id=p_solicitudId AND tipo='VACACION' AND estado='PENDIENTE'.
#
#   2) BEFORE UPDATE — trg_solicitud_validar_saldo_vacaciones:
#      Si OLD.estado='PENDIENTE' y NEW.estado='APROBADA' y tipo VACACION,
#      calcula días disponibles (LFT + extra - usados - pendientes) y compara
#      con NEW.diasSolicitados. Si saldo insuficiente, SIGNAL SQLSTATE '45000'
#      y el UPDATE se aborta (Python recibe error MySQL).
#
#   3) Si el BEFORE UPDATE permite la fila, MySQL aplica el UPDATE.
#
#   4) AFTER UPDATE — trg_solicitud_descontar_vacaciones:
#      Recalcula saldo y hace INSERT/UPDATE en CalculoLaboralInfo.diasVacaciones
#      con notas de trazabilidad. Este trigger NO se invoca desde Python; es
#      consecuencia automática del UPDATE del SP.
#
# Flujo resumido:
#   Python -> CALL -> SP UPDATE -> BEFORE trg_solicitud_validar_saldo_vacaciones
#          -> UPDATE confirmado -> AFTER trg_solicitud_descontar_vacaciones
# ============================================================
def ejecutar_sp_aprobar_vacaciones() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_aprobar_vacaciones
    # ========================================================
    # Parámetros: solicitudId, aprobadoPorId (RH), respuesta de aprobación.
    # MySQL ejecuta el UPDATE dentro del SP; los triggers BEFORE y AFTER UPDATE
    # sobre SolicitudPermiso se encadenan automáticamente. Si trg_solicitud_validar_saldo_vacaciones
    # rechaza por saldo, ningún cambio persiste (SIGNAL). Si pasa, trg_solicitud_descontar_vacaciones
    # actualiza CalculoLaboralInfo. El SP también devuelve ROW_COUNT() como filasActualizadas.
    # Python NO llama a los triggers; solo envía CALL y gestiona transacción COMMIT/ROLLBACK.
    ejecutar_call(
        "CALL sp_aprobar_vacaciones(%s, %s, %s)",
        (
            leer_entero("solicitudId: "),
            leer_entero("aprobadoPorId (empleado RH): "),
            leer_texto("respuesta: ", "Aprobada vía SP académico"),
        ),
        muta_datos=True,
        descripcion="SP: sp_aprobar_vacaciones (RF-H13) — dispara triggers de vacaciones",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_registrar_asistencia (RF-H06)
#
# Parámetros: empleadoId, fecha, horaEntrada, horaSalida, estado (ENUM).
# Consecuencia en MySQL: INSERT en Asistencia con ON DUPLICATE KEY UPDATE
# (upsert por empleadoId+fecha). Devuelve id de la fila afectada.
# ============================================================
def ejecutar_sp_registrar_asistencia() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_registrar_asistencia
    # ========================================================
    # Cinco parámetros IN capturados por consola. MySQL inserta o actualiza Asistencia
    # según clave única empleado/fecha; no interviene la cadena de triggers de vacaciones
    # ni de capacitación.
    ejecutar_call(
        "CALL sp_registrar_asistencia(%s, %s, %s, %s, %s)",
        (
            leer_entero("empleadoId: "),
            leer_texto("fecha (YYYY-MM-DD HH:MM:SS): ", "2026-08-01 08:00:00"),
            leer_texto("horaEntrada: ", "08:05"),
            leer_texto("horaSalida: ", "17:00"),
            leer_texto("estado (PUNTUAL/RETARDO/...): ", "PUNTUAL"),
        ),
        muta_datos=True,
        descripcion="SP: sp_registrar_asistencia (RF-H06)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_contratar_candidato (RF-H04)
#
# Parámetro: candidatoId — PK de Candidato.
# Consecuencia en MySQL: UPDATE Candidato SET etapa='CONTRATADO' WHERE id coincide
# y etapa <> 'CONTRATADO'. Devuelve ROW_COUNT(). No INSERT en CapacitacionEmpleado.
# ============================================================
def ejecutar_sp_contratar_candidato() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_contratar_candidato
    # ========================================================
    # Un solo parámetro IN. MySQL actualiza la etapa del candidato; triggers sobre
    # Candidato (p. ej. postulación única) no aplican en UPDATE de etapa.
    ejecutar_call(
        "CALL sp_contratar_candidato(%s)",
        (leer_entero("candidatoId: "),),
        muta_datos=True,
        descripcion="SP: sp_contratar_candidato (RF-H04)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_registrar_documento (RF-H18)
#
# Parámetros: empleadoId, tipo, nombre, rutaArchivo, vencimiento.
# Consecuencia en MySQL: INSERT en Documento (activo=1). Devuelve documentoId.
# ============================================================
def ejecutar_sp_registrar_documento() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_registrar_documento
    # ========================================================
    # leer_texto con valores por defecto opcionales si el operador presiona Enter.
    # MySQL persiste el documento en expediente del empleado indicado.
    ejecutar_call(
        "CALL sp_registrar_documento(%s, %s, %s, %s, %s)",
        (
            leer_entero("empleadoId: "),
            leer_texto("tipo: ", "IDENTIFICACION"),
            leer_texto("nombre: ", "Documento académico"),
            leer_texto("rutaArchivo: ", "/uploads/academico.pdf"),
            leer_texto("vencimiento (YYYY-MM-DD): ", "2027-12-31"),
        ),
        muta_datos=True,
        descripcion="SP: sp_registrar_documento (RF-H18)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_registrar_capacitacion (RF-H05)
#
# Parámetros: nombre, descripcion, fechaInicio, cupoMaximo.
# Consecuencia en MySQL: INSERT en Capacitacion (estado PROGRAMADA).
# Define cupoMaximo usado luego por trg_capacitacion_valida_cupo en inscripciones.
# No ejecuta el trigger de cupo (ese trigger actúa sobre CapacitacionEmpleado).
# ============================================================
def ejecutar_sp_registrar_capacitacion() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_registrar_capacitacion
    # ========================================================
    # MySQL crea el registro de capacitación y devuelve capacitacionId.
    # Las inscripciones posteriores (sp_inscribir_capacitacion) usarán ese id
    # y entonces sí puede ejecutarse trg_capacitacion_valida_cupo.
    ejecutar_call(
        "CALL sp_registrar_capacitacion(%s, %s, %s, %s)",
        (
            leer_texto("nombre: ", "Capacitación académica SP"),
            leer_texto("descripcion: ", "Evidencia BDA"),
            leer_texto("fechaInicio (YYYY-MM-DD HH:MM:SS): ", "2026-09-01 09:00:00"),
            leer_entero("cupoMaximo: "),
        ),
        muta_datos=True,
        descripcion="SP: sp_registrar_capacitacion (RF-H05)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_actualizar_departamento (RF-H19)
#
# Parámetros: departamentoId, nombre, descripcion, supervisorId, activo (1/0).
# Consecuencia en MySQL: UPDATE Departamento; devuelve filasActualizadas.
# ============================================================
def ejecutar_sp_actualizar_departamento() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_actualizar_departamento
    # ========================================================
    # MySQL actualiza campos del departamento existente; sin triggers de vacaciones
    # ni cupo de capacitación en esta operación.
    ejecutar_call(
        "CALL sp_actualizar_departamento(%s, %s, %s, %s, %s)",
        (
            leer_entero("departamentoId: "),
            leer_texto("nombre: "),
            leer_texto("descripcion: ", "Actualizado académico"),
            leer_entero("supervisorId: "),
            leer_entero("activo (1/0): "),
        ),
        muta_datos=True,
        descripcion="SP: sp_actualizar_departamento (RF-H19)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_registrar_evento (RF-H17)
#
# Parámetros: titulo, descripcion, fecha, ubicacion.
# Consecuencia en MySQL: INSERT en EventoOrganizacional (inscripcionAbierta=1, activo=1).
# ============================================================
def ejecutar_sp_registrar_evento() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_registrar_evento
    # ========================================================
    # Cuatro parámetros IN desde consola. MySQL inserta el evento organizacional
    # y retorna el identificador generado.
    ejecutar_call(
        "CALL sp_registrar_evento(%s, %s, %s, %s)",
        (
            leer_texto("titulo: ", "Evento académico"),
            leer_texto("descripcion: ", "Evidencia SP"),
            leer_texto("fecha: ", "2026-10-15 10:00:00"),
            leer_texto("ubicacion: ", "Auditorio"),
        ),
        muta_datos=True,
        descripcion="SP: sp_registrar_evento (RF-H17)",
    )


# ============================================================
# FUNCIÓN WRAPPER — sp_inscribir_capacitacion (RF-H05)
#
# Recolección de parámetros:
#   capacitacionId — FK a Capacitacion (debe existir; cupoMaximo definido al crear)
#   empleadoId     — FK a Empleado a inscribir
#
# Consecuencia en MySQL (cadena completa tras el CALL):
#
#   1) El SP ejecuta INSERT INTO CapacitacionEmpleado
#      (capacitacionId, empleadoId, estado='INSCRITO', createdAt=NOW(3)).
#
#   2) Antes de materializar la fila, MySQL dispara BEFORE INSERT:
#      trg_capacitacion_valida_cupo sobre CapacitacionEmpleado.
#
#   3) El trigger cuenta inscripciones actuales (COUNT en CapacitacionEmpleado
#      para ese capacitacionId) y lee cupoMaximo de Capacitacion.
#      - Si la capacitación no existe (cupoMaximo NULL): SIGNAL '45000'
#        con mensaje de capacitación inexistente; el INSERT del SP se cancela.
#      - Si inscritos >= cupoMaximo: SIGNAL '45000' con mensaje de cupo lleno;
#        el INSERT del SP se cancela.
#      - Si hay cupo: el INSERT continúa y la inscripción queda persistida.
#
#   4) El SP devuelve LAST_INSERT_ID() AS inscripcionId si el INSERT tuvo éxito.
#
# Flujo resumido:
#   Python -> CALL sp_inscribir_capacitacion -> SP INSERT CapacitacionEmpleado
#          -> BEFORE INSERT trg_capacitacion_valida_cupo -> INSERT OK o SIGNAL
#
# IMPORTANTE: Python no invoca el trigger; MySQL lo ejecuta como efecto del INSERT
# que realiza el procedimiento almacenado dentro del motor.
# ============================================================
def ejecutar_sp_inscribir_capacitacion() -> None:
    # ========================================================
    # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO sp_inscribir_capacitacion
    # ========================================================
    # Dos enteros capturados por consola. MySQL ejecuta el SP, que a su vez inserta
    # en CapacitacionEmpleado; eso encadena trg_capacitacion_valida_cupo (BEFORE INSERT).
    # Error 45000 del trigger propaga a Python como MySQLError; COMMIT no confirma fila.
    # Inscripción exitosa incrementa el conteo que el trigger evaluará en la próxima CALL.
    ejecutar_call(
        "CALL sp_inscribir_capacitacion(%s, %s)",
        (leer_entero("capacitacionId: "), leer_entero("empleadoId: ")),
        muta_datos=True,
        descripcion="SP: sp_inscribir_capacitacion (RF-H05) — puede disparar trg_capacitacion_valida_cupo",
    )


# ============================================================
# MENÚ INTERACTIVO — procedimientos almacenados
#
# Estructura:
#   opciones — dict clave str -> (nombre_visible, callable).
#   Cada callable es ejecutar_sp_* o lambda que captura parámetros extra
#   (p. ej. opción 1 pide empleadoId; opción 8 pide usuarioId y mes).
#
# Bucle:
#   Imprime ENCABEZADO_ACADEMICO una vez al entrar.
#   Repite listado numerado hasta que el operador elija "0" (Volver).
#   fn[1]() despacha al wrapper correspondiente, que a su vez llama ejecutar_call.
#
# Relación con triggers:
#   Opciones 4 (sp_aprobar_vacaciones) y 12 (sp_inscribir_capacitacion) son las
#   que encadenan triggers automáticos en MySQL tras el CALL (ver bloques arriba).
# ============================================================
def menu() -> None:
    print(ENCABEZADO_ACADEMICO)
    # Mapa opción -> (etiqueta en pantalla, función ejecutora del SP).
    opciones = {
        "1": ("sp_consultar_saldo_vacaciones (solo lectura)", lambda: ejecutar_sp_consultar_saldo_vacaciones(leer_entero("empleadoId: "))),
        "2": ("sp_registrar_empleado", ejecutar_sp_registrar_empleado),
        "3": ("sp_crear_vacante", ejecutar_sp_crear_vacante),
        "4": ("sp_aprobar_vacaciones", ejecutar_sp_aprobar_vacaciones),
        "5": ("sp_registrar_asistencia", ejecutar_sp_registrar_asistencia),
        "6": ("sp_contratar_candidato", ejecutar_sp_contratar_candidato),
        "7": ("sp_registrar_documento", ejecutar_sp_registrar_documento),
        "8": ("sp_generar_reporte_empleados_depto", lambda: ejecutar_sp_generar_reporte_empleados_depto(leer_entero("usuarioId: "), leer_texto("mes (YYYY-MM): ", "2026-08"))),
        "9": ("sp_registrar_capacitacion", ejecutar_sp_registrar_capacitacion),
        "10": ("sp_actualizar_departamento", ejecutar_sp_actualizar_departamento),
        "11": ("sp_registrar_evento", ejecutar_sp_registrar_evento),
        "12": ("sp_inscribir_capacitacion", ejecutar_sp_inscribir_capacitacion),
    }
    while True:
        print("\n--- Procedimientos almacenados ---")
        # Recorre opciones en orden de inserción del dict (1..12).
        for k, (nombre, _) in opciones.items():
            print(f"{k}. {nombre}")
        print("0. Volver")
        op = input("\nOpción: ").strip()
        if op == "0":
            break
        fn = opciones.get(op)
        if fn:
            # fn[0] es la etiqueta; fn[1] es el callable que dispara el CALL vía wrapper.
            fn[1]()
        else:
            print("Opción no válida.")


if __name__ == "__main__":
    menu()
