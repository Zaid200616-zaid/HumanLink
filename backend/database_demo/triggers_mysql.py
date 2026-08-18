#!/usr/bin/env python3
"""
HumanLink — integración Python + MySQL: triggers y procedimientos almacenados.

Sistema operativo: Next.js -> Prisma -> MySQL
Este módulo: Python -> SQL -> MySQL -> resultado
"""

# ============================================================
# INTEGRACIÓN PYTHON + MYSQL — HUMANLINK
#
# TRIGGERS:
# No se invocan desde Python. Python envía INSERT/UPDATE o CALL;
# MySQL ejecuta automáticamente el trigger según el evento.
#
# PROCEDIMIENTOS ALMACENADOS:
# Se invocan explícitamente desde Python mediante CALL.
# ============================================================

from __future__ import annotations

from mysql.connector import Error as MySQLError

from db_utils import (
    conectar,
    confirmar_mutacion,
    db_config,
    elegir_commit_o_rollback,
    fetchall_dict,
    fetchone_dict,
    imprimir_filas,
    leer_entero,
    leer_texto,
    mensaje_mysql,
)

# Nombres de triggers que deben existir en MySQL según database/triggers_mysql.sql.
REQUIRED_TRIGGERS = (
    "trg_capacitacion_valida_cupo",
    "trg_candidato_postulacion_unica",
    "trg_solicitud_validar_saldo_vacaciones",
    "trg_solicitud_descontar_vacaciones",
)


# ---------------------------------------------------------------------------
# Utilidades internas (consultas previas a la operación)
# ---------------------------------------------------------------------------

def _info_cupo(human, capacitacion_id: int) -> dict:
    # Consulta auxiliar de solo lectura: obtiene nombre, cupo máximo e inscritos
    # de una capacitación antes o después de un INSERT/CALL.
    # human: cursor MySQL ya abierto sobre la conexión activa.
    # capacitacion_id: identificador numérico de la fila en Capacitacion.
    # Retorna dict con claves nombre, cupoMaximo e inscritos.
    # Primer SELECT sobre Capacitacion: lee nombre y cupoMaximo de la capacitación.
    human.execute(
        "SELECT nombre, cupoMaximo FROM Capacitacion WHERE id = %s",
        (capacitacion_id,),
    )
    # Convierte la primera fila del result set en diccionario columnas->valores.
    cap = fetchone_dict(human)
    # Segundo SELECT sobre CapacitacionEmpleado: cuenta inscripciones actuales.
    human.execute(
        "SELECT COUNT(*) AS inscritos FROM CapacitacionEmpleado WHERE capacitacionId = %s",
        (capacitacion_id,),
    )
    # Si no hay filas, usa inscritos=0 como valor por defecto.
    cnt = fetchone_dict(human) or {"inscritos": 0}
    # Ensambla y devuelve el resumen de cupo para impresión o comparación.
    return {
        "nombre": (cap or {}).get("nombre", "?"),
        "cupoMaximo": (cap or {}).get("cupoMaximo", "?"),
        "inscritos": cnt.get("inscritos", 0),
    }


def _info_solicitud(human, solicitud_id: int):
    # Consulta auxiliar: obtiene datos de una solicitud de permiso y del empleado asociado.
    # human: cursor MySQL sobre la conexión activa.
    # solicitud_id: identificador de la fila en SolicitudPermiso.
    # Retorna dict con columnas del JOIN o None si la solicitud no existe.
    # SELECT con JOIN entre SolicitudPermiso y Empleado filtrado por id de solicitud.
    human.execute(
        """
        SELECT s.id, s.empleadoId, s.tipo, s.estado, s.diasSolicitados,
               s.aprobacionSupervisor, e.nombre, e.apellidoPaterno
          FROM SolicitudPermiso s
          JOIN Empleado e ON e.id = s.empleadoId
         WHERE s.id = %s
        """,
        (solicitud_id,),
    )
    # Devuelve la fila como diccionario o None.
    return fetchone_dict(human)


def _saldo_calculo_laboral(human, empleado_id: int):
    # Consulta auxiliar: lee el saldo de vacaciones persistido en CalculoLaboralInfo.
    # human: cursor MySQL sobre la conexión activa.
    # empleado_id: identificador del empleado cuyo saldo se consulta.
    # Retorna dict con empleadoId, diasVacaciones, notas, updatedAt o None.
    # SELECT sobre CalculoLaboralInfo filtrado por empleadoId.
    human.execute(
        "SELECT empleadoId, diasVacaciones, notas, updatedAt "
        "FROM CalculoLaboralInfo WHERE empleadoId = %s",
        (empleado_id,),
    )
    # Devuelve la fila como diccionario o None si no hay registro laboral.
    return fetchone_dict(human)


def _fetch_all_resultsets(human) -> list[dict]:
    """Recupera todos los result sets producidos por un CALL."""
    # Acumula filas de todos los result sets que MySQL devuelve tras un CALL.
    # human: cursor MySQL que acaba de ejecutar CALL sp_xxx.
    # Retorna lista de dicts con todas las filas de todos los result sets.
    rows: list[dict] = []
    # El primer result set devuelto por MySQL tras el CALL (si el SP hace SELECT).
    if human.description:
        rows.extend(fetchall_dict(human))
    # Algunos procedimientos devuelven más de un result set; se recorren con nextset().
    while human.nextset():
        if human.description:
            rows.extend(fetchall_dict(human))
    # Devuelve la lista consolidada de filas para imprimir_filas().
    return rows


def _info_candidato(human, candidato_id: int):
    # Consulta auxiliar: obtiene estado y datos del candidato antes o después de un UPDATE/CALL.
    # human: cursor MySQL sobre la conexión activa.
    # candidato_id: identificador de la fila en Candidato.
    # Retorna dict con id, nombre, email, vacanteId, etapa, updatedAt o None.
    # SELECT sobre Candidato filtrado por id.
    human.execute(
        """
        SELECT id, nombre, apellidoPaterno, email, vacanteId, etapa, updatedAt
          FROM Candidato
         WHERE id = %s
        """,
        (candidato_id,),
    )
    # Devuelve la fila como diccionario o None si el candidato no existe.
    return fetchone_dict(human)


def _info_capacitacion(human, capacitacion_id: int):
    # Consulta auxiliar: verifica la fila insertada o existente en Capacitacion.
    # human: cursor MySQL sobre la conexión activa.
    # capacitacion_id: identificador de la capacitación recién creada o consultada.
    # Retorna dict con columnas de Capacitacion o None.
    # SELECT sobre Capacitacion filtrado por id.
    human.execute(
        """
        SELECT id, nombre, descripcion, fechaInicio, cupoMaximo, estado, updatedAt
          FROM Capacitacion
         WHERE id = %s
        """,
        (capacitacion_id,),
    )
    # Devuelve la fila como diccionario o None.
    return fetchone_dict(human)


def _imprimir_cupo(human, capacitacion_id: int, empleado_id: int | None, titulo: str) -> None:
    # Imprime en consola el estado del cupo de una capacitación (lectura previa/posterior).
    # human: cursor MySQL sobre la conexión activa.
    # capacitacion_id: capacitación cuyo cupo se reporta.
    # empleado_id: empleado involucrado en la operación; None omite esa línea.
    # titulo: encabezado textual del bloque impreso (p. ej. "Antes", "Después").
    # No retorna valor; solo escribe en stdout.
    # Delega la lectura de cupo a _info_cupo mediante SELECT auxiliares.
    info = _info_cupo(human, capacitacion_id)
    # Calcula lugares libres restando inscritos del cupo máximo.
    lugares = int(info["cupoMaximo"]) - int(info["inscritos"])
    print(f"\n{titulo}")
    print(f"  Capacitación: {info['nombre']} (id={capacitacion_id})")
    print(f"  Cupo máximo: {info['cupoMaximo']}")
    print(f"  Inscritos actuales: {info['inscritos']}")
    print(f"  Lugares disponibles: {lugares}")
    # Imprime el id del empleado solo cuando se proporcionó.
    if empleado_id is not None:
        print(f"  Empleado id: {empleado_id}")


# ============================================================
# SECCIÓN 1 — TRIGGERS
#
# Las funciones siguientes NO invocan triggers directamente.
# Envían INSERT/UPDATE a MySQL; el motor ejecuta los triggers
# definidos en database/triggers_mysql.sql.
# ============================================================


# ============================================================
# TRIGGER: trg_capacitacion_valida_cupo
# Tabla: CapacitacionEmpleado
# Evento: BEFORE INSERT
# Objetivo: validar cupo antes de inscribir un empleado.
#
# Flujo:
#   Python -> INSERT CapacitacionEmpleado
#         -> MySQL BEFORE INSERT -> trg_capacitacion_valida_cupo
#         -> INSERT permitido o SIGNAL SQLSTATE '45000'
# ============================================================
def inscribir_empleado_capacitacion(capacitacion_id: int, empleado_id: int) -> None:
    # Inscribe un empleado enviando INSERT directo; MySQL valida cupo vía trigger BEFORE INSERT.
    # capacitacion_id: id de la capacitación destino.
    # empleado_id: id del empleado a inscribir.
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Abre la conexión con el servidor MySQL usando la configuración del entorno.
    conn = conectar()
    # Obtiene el cursor utilizado para enviar instrucciones SQL a MySQL.
    human = conn.cursor()
    try:
        # Inicia una transacción explícita para poder confirmar o revertir el INSERT.
        conn.start_transaction()
        # Lectura previa del cupo mediante SELECT auxiliar (no dispara triggers).
        antes = _info_cupo(human, capacitacion_id)
        print(f"  Capacitación: {antes['nombre']} (id={capacitacion_id})")
        print(f"  Cupo máximo: {antes['cupoMaximo']}")
        print(f"  Inscritos actuales: {antes['inscritos']}")
        print(f"  Empleado id: {empleado_id}")

        sql = (
            "INSERT INTO CapacitacionEmpleado (capacitacionId, empleadoId, estado, createdAt) "
            "VALUES (%s, %s, 'INSCRITO', NOW(3))"
        )

        try:
            # Este INSERT se envía a MySQL sobre la tabla CapacitacionEmpleado.
            human.execute(sql, (capacitacion_id, empleado_id))
            #
            # Antes de que MySQL complete el INSERT, detecta que existe
            # un trigger BEFORE INSERT asociado a CapacitacionEmpleado.
            #
            # MySQL ejecuta automáticamente:
            # trg_capacitacion_valida_cupo
            #
            # Si existe cupo:
            #     MySQL permite continuar el INSERT.
            #
            # Si no existe cupo:
            #     el trigger ejecuta SIGNAL SQLSTATE '45000'
            #     y el INSERT es rechazado.
            #
            # IMPORTANTE:
            # Python NO invoca directamente al trigger.
            # MySQL lo ejecuta como consecuencia del INSERT.

            # Lectura posterior del cupo para verificar el efecto del INSERT.
            despues = _info_cupo(human, capacitacion_id)
            print(f"  Inscritos después: {despues['inscritos']}")
            # Solicita COMMIT o ROLLBACK: confirma o revierte la transacción abierta.
            elegir_commit_o_rollback(conn, "Confirme COMMIT o ROLLBACK.")
        except MySQLError as err:
            # Revierte la transacción cuando MySQL rechaza la operación (p. ej. SIGNAL del trigger).
            conn.rollback()
            print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Cierra cursor y conexión sin importar éxito o error.
        human.close()
        conn.close()


# ============================================================
# TRIGGER: trg_candidato_postulacion_unica
# Tabla: Candidato
# Evento: BEFORE INSERT
# Objetivo: impedir postulaciones duplicadas activas (misma vacante y correo).
#
# Flujo:
#   Python -> INSERT Candidato
#         -> MySQL BEFORE INSERT -> trg_candidato_postulacion_unica
#         -> INSERT permitido o SIGNAL SQLSTATE '45000'
# ============================================================
def registrar_postulacion(vacante_id: int, email: str) -> None:
    # Registra un candidato enviando INSERT; MySQL valida unicidad vía trigger BEFORE INSERT.
    # vacante_id: id de la vacante a la que postula el candidato.
    # email: correo del postulante (se normaliza a minúsculas al enlazar parámetros).
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para ejecutar SELECT e INSERT.
    human = conn.cursor()
    try:
        # Inicia transacción explícita para poder confirmar o revertir el INSERT.
        conn.start_transaction()
        # SELECT previo: lista postulaciones activas con la misma vacante y correo.
        human.execute(
            """
            SELECT id, email, vacanteId, etapa
              FROM Candidato
             WHERE vacanteId = %s
               AND LOWER(TRIM(email)) = LOWER(TRIM(%s))
               AND etapa NOT IN ('RECHAZADO', 'CONTRATADO')
            """,
            (vacante_id, email),
        )
        # Convierte el result set en lista de dicts para inspección previa.
        rows = fetchall_dict(human)
        # Informa si ya existen postulaciones activas que el trigger podría rechazar.
        if rows:
            print("Postulaciones activas existentes:")
            for row in rows:
                print(f"  id={row['id']} email={row['email']} etapa={row['etapa']}")
        else:
            print("Sin postulaciones activas para esa vacante y correo.")

        sql = (
            "INSERT INTO Candidato "
            "(nombre, apellidoPaterno, email, vacanteId, etapa, createdAt, updatedAt) "
            "VALUES ('Demo', 'Trigger', %s, %s, 'RECEPCION', NOW(3), NOW(3))"
        )

        try:
            # Este INSERT intenta registrar un candidato en la tabla Candidato.
            #
            # Al ejecutarse sobre Candidato, MySQL activa automáticamente
            # el trigger BEFORE INSERT:
            # trg_candidato_postulacion_unica
            #
            # Si ya existe una postulación activa con el mismo correo y vacante:
            #     el trigger ejecuta SIGNAL SQLSTATE '45000'.
            #
            # IMPORTANTE:
            # Python NO invoca directamente al trigger.
            human.execute(sql, (email.strip().lower(), vacante_id))
            # INSERT aceptado por MySQL (trigger no emitió SIGNAL).
            print("INSERT completado.")
            # Pregunta al operador si confirma COMMIT o prefiere ROLLBACK.
            elegir_commit_o_rollback(conn)
        except MySQLError as err:
            # MySQL rechazó el INSERT (p. ej. SIGNAL del trigger); revierte la transacción.
            conn.rollback()
            print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# TRIGGER: trg_solicitud_validar_saldo_vacaciones
# Tabla: SolicitudPermiso
# Evento: BEFORE UPDATE
# Objetivo: validar saldo suficiente al aprobar vacaciones.
#
# Flujo:
#   Python -> UPDATE SolicitudPermiso (PENDIENTE -> APROBADA)
#         -> MySQL BEFORE UPDATE -> trg_solicitud_validar_saldo_vacaciones
# ============================================================
def aprobar_solicitud_vacaciones(solicitud_id: int) -> None:
    # Aprueba una solicitud enviando UPDATE directo; MySQL valida saldo vía trigger BEFORE UPDATE.
    # solicitud_id: id de la fila en SolicitudPermiso que debe estar en estado PENDIENTE.
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para SELECT previos y UPDATE.
    human = conn.cursor()
    try:
        # Inicia transacción explícita.
        conn.start_transaction()
        # SELECT previo: obtiene estado y días solicitados de la solicitud.
        info = _info_solicitud(human, solicitud_id)
        # Si la solicitud no existe, revierte y termina sin UPDATE.
        if not info:
            conn.rollback()
            print(f"Solicitud {solicitud_id} no encontrada.")
            return

        # SELECT previo: lee saldo persistido en CalculoLaboralInfo del empleado.
        saldo = _saldo_calculo_laboral(human, info["empleadoId"])
        print(f"  Empleado: {info['nombre']} {info['apellidoPaterno']} (id={info['empleadoId']})")
        print(f"  Tipo: {info['tipo']}  Estado: {info['estado']}")
        print(f"  Días solicitados: {info['diasSolicitados']}")
        # Imprime saldo solo si existe fila en CalculoLaboralInfo.
        if saldo:
            print(f"  Saldo CalculoLaboralInfo: {saldo.get('diasVacaciones')} días")

        sql = (
            "UPDATE SolicitudPermiso "
            "SET estado = 'APROBADA', respuesta = 'Evidencia Python triggers_mysql', "
            "    fechaResolucion = NOW(3), updatedAt = NOW(3) "
            "WHERE id = %s AND estado = 'PENDIENTE'"
        )

        try:
            # Este UPDATE intenta cambiar la solicitud de PENDIENTE a APROBADA
            # sobre la tabla SolicitudPermiso.
            human.execute(sql, (solicitud_id,))
            #
            # Antes del UPDATE MySQL ejecuta automáticamente:
            # trg_solicitud_validar_saldo_vacaciones
            #
            # Si la validación permite continuar, se realiza el UPDATE.
            #
            # Después del UPDATE MySQL ejecuta automáticamente:
            # trg_solicitud_descontar_vacaciones
            # (actualiza CalculoLaboralInfo.diasVacaciones).
            #
            # IMPORTANTE:
            # Python NO invoca directamente a ninguno de los triggers.

            # Si ninguna fila cumplió WHERE id AND estado PENDIENTE, no hubo cambio.
            if human.rowcount == 0:
                conn.rollback()
                print("No se actualizó ninguna fila.")
                return
            # SELECT posterior: confirma el nuevo estado de la solicitud.
            info_despues = _info_solicitud(human, solicitud_id)
            print(f"  Estado después: {info_despues.get('estado')}")
            # Pregunta COMMIT o ROLLBACK al operador.
            elegir_commit_o_rollback(conn, "Confirme COMMIT o ROLLBACK.")
        except MySQLError as err:
            # MySQL rechazó el UPDATE (p. ej. saldo insuficiente vía SIGNAL del trigger).
            conn.rollback()
            print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# TRIGGER: trg_solicitud_descontar_vacaciones
# Tabla: SolicitudPermiso / CalculoLaboralInfo
# Evento: AFTER UPDATE (vía CALL sp_aprobar_vacaciones)
# Objetivo: descontar días de vacaciones tras aprobar la solicitud.
#
# Flujo:
#   Python -> CALL sp_aprobar_vacaciones
#         -> MySQL UPDATE SolicitudPermiso
#         -> BEFORE UPDATE -> trg_solicitud_validar_saldo_vacaciones
#         -> AFTER UPDATE -> trg_solicitud_descontar_vacaciones
# ============================================================
def aprobar_vacaciones_con_descuento(solicitud_id: int, rh_id: int) -> None:
    # Aprueba vacaciones vía CALL al SP; el UPDATE interno dispara triggers BEFORE y AFTER UPDATE.
    # solicitud_id: id de solicitud PENDIENTE de tipo VACACION.
    # rh_id: id del usuario RH que aprueba (parámetro p_aprobadoPorId del SP).
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para SELECT previos, CALL y lecturas posteriores.
    human = conn.cursor()
    try:
        # Inicia transacción explícita.
        conn.start_transaction()
        # SELECT previo: valida que la solicitud exista y cumpla tipo/estado requeridos.
        info = _info_solicitud(human, solicitud_id)
        # Si no es VACACION PENDIENTE, revierte y termina sin CALL.
        if not info or info["tipo"] != "VACACION" or info["estado"] != "PENDIENTE":
            conn.rollback()
            print("Se requiere solicitud PENDIENTE de tipo VACACION.")
            return

        # Extrae empleadoId para consultas de saldo antes/después.
        empleado_id = info["empleadoId"]
        # SELECT previo: saldo en CalculoLaboralInfo antes del CALL.
        antes = _saldo_calculo_laboral(human, empleado_id)

        print(f"  Solicitud: #{solicitud_id}  Días: {info['diasSolicitados']}")
        print(f"  Saldo antes: {(antes or {}).get('diasVacaciones', '—')} días")

        # ========================================================
        # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO
        # sp_aprobar_vacaciones
        # ========================================================
        #
        # Python
        #   ↓
        # CALL sp_aprobar_vacaciones(...)
        #   ↓
        # UPDATE SolicitudPermiso
        #   ↓
        # BEFORE UPDATE → trg_solicitud_validar_saldo_vacaciones
        #   ↓
        # UPDATE permitido
        #   ↓
        # AFTER UPDATE → trg_solicitud_descontar_vacaciones
        #   ↓
        # actualización de CalculoLaboralInfo
        human.execute(
            "CALL sp_aprobar_vacaciones(%s, %s, %s)",
            (solicitud_id, rh_id, "Evidencia Python"),
        )
        # Descarta result sets adicionales que el CALL pueda devolver antes de continuar.
        while human.nextset():
            pass

        # SELECT posterior: saldo en CalculoLaboralInfo tras el descuento del trigger AFTER UPDATE.
        despues = _saldo_calculo_laboral(human, empleado_id)
        print(f"  Saldo anterior: {(antes or {}).get('diasVacaciones', '—')} días")
        print(f"  Días utilizados: {info['diasSolicitados']} días")
        print(f"  Saldo posterior: {(despues or {}).get('diasVacaciones', '—')} días")

        # Pregunta COMMIT o ROLLBACK al operador.
        elegir_commit_o_rollback(conn, "Confirme COMMIT o ROLLBACK.")
    except MySQLError as err:
        # Error en CALL o en triggers disparados por el UPDATE interno del SP.
        conn.rollback()
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# SECCIÓN 2 — PROCEDIMIENTOS ALMACENADOS
#
# Definiciones: database/procedures_mysql.sql
# Python ejecuta CALL; la lógica permanece en MySQL.
# ============================================================


# ============================================================
# PROCEDIMIENTO ALMACENADO: sp_inscribir_capacitacion
# Objetivo: inscribir empleado en capacitación.
# Parámetros: IN p_capacitacionId INT, IN p_empleadoId INT
# Tabla: CapacitacionEmpleado (INSERT vía SP)
# Operación: CALL sp_inscribir_capacitacion
#
# Flujo completo Python -> CALL -> INSERT -> trigger:
#
# Python
#   ↓
# CALL sp_inscribir_capacitacion(p_capacitacionId, p_empleadoId)
#   ↓
# MySQL ejecuta el cuerpo del procedimiento almacenado
#   ↓
# INSERT INTO CapacitacionEmpleado (...)
#   ↓
# MySQL detecta evento BEFORE INSERT sobre CapacitacionEmpleado
#   ↓
# MySQL ejecuta automáticamente trg_capacitacion_valida_cupo
#   ↓
# Si hay cupo: INSERT permitido y el SP continúa
# Si no hay cupo: SIGNAL SQLSTATE '45000' y el CALL falla
#   ↓
# Python recibe result sets o excepción MySQLError
# ============================================================
def inscribir_capacitacion(capacitacion_id: int, empleado_id: int) -> None:
    # Inscribe empleado invocando sp_inscribir_capacitacion; el INSERT interno dispara el trigger de cupo.
    # capacitacion_id: id de la capacitación (p_capacitacionId del SP).
    # empleado_id: id del empleado (p_empleadoId del SP).
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para SELECT auxiliares, CALL e impresión de resultados.
    human = conn.cursor()
    try:
        # Inicia transacción explícita.
        conn.start_transaction()
        # Imprime estado del cupo antes del CALL (SELECT auxiliar, no dispara triggers).
        _imprimir_cupo(human, capacitacion_id, empleado_id, "Antes")

        try:
            # ========================================================
            # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO
            # sp_inscribir_capacitacion
            # ========================================================
            #
            # Se solicita a MySQL ejecutar sp_inscribir_capacitacion
            # enviando el ID de la capacitación y el ID del empleado.
            #
            # Python
            #   ↓
            # CALL sp_inscribir_capacitacion(...)
            #   ↓
            # INSERT CapacitacionEmpleado (dentro del SP)
            #   ↓
            # MySQL detecta BEFORE INSERT
            #   ↓
            # trg_capacitacion_valida_cupo
            #   ↓
            # INSERT permitido o SIGNAL 45000
            #
            # IMPORTANTE:
            # Python NO invoca directamente al trigger.
            # MySQL lo ejecuta como consecuencia del INSERT del procedimiento.
            human.execute(
                "CALL sp_inscribir_capacitacion(%s, %s)",
                (capacitacion_id, empleado_id),
            )

            # Recupera todos los result sets devueltos por MySQL tras el CALL.
            result = _fetch_all_resultsets(human)
            # Imprime filas del result set en formato tabular.
            imprimir_filas(result)
            # Imprime estado del cupo después del CALL (SELECT auxiliar).
            _imprimir_cupo(human, capacitacion_id, empleado_id, "Después")
            # Pregunta COMMIT o ROLLBACK al operador.
            elegir_commit_o_rollback(conn)
        except MySQLError as err:
            # CALL falló (p. ej. cupo agotado vía SIGNAL del trigger).
            conn.rollback()
            print(f"Error MySQL: {mensaje_mysql(err)}")
            # Muestra cupo actual tras el error para diagnóstico.
            _imprimir_cupo(human, capacitacion_id, empleado_id, "Estado tras error")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# PROCEDIMIENTO ALMACENADO: sp_contratar_candidato
# Objetivo: marcar candidato como CONTRATADO.
# Parámetro: IN p_candidatoId INT
# Tabla: Candidato (UPDATE etapa)
# Operación: CALL sp_contratar_candidato
# ============================================================
def contratar_candidato(candidato_id: int) -> None:
    # Contrata candidato invocando sp_contratar_candidato; el SP hace UPDATE de etapa a CONTRATADO.
    # candidato_id: id del candidato (p_candidatoId del SP).
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para SELECT previo/posterior y CALL.
    human = conn.cursor()
    try:
        # Inicia transacción explícita.
        conn.start_transaction()

        # SELECT previo: lee la etapa actual del candidato antes del CALL.
        antes = _info_candidato(human, candidato_id)
        # Si el candidato no existe, revierte y termina sin CALL.
        if not antes:
            conn.rollback()
            print(f"Candidato {candidato_id} no encontrado.")
            return
        print(f"  id={antes['id']} email={antes['email']} etapa={antes['etapa']}")

        # ========================================================
        # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO
        # sp_contratar_candidato
        # ========================================================
        #
        # MySQL ejecuta el procedimiento, que realiza UPDATE sobre Candidato
        # (campo etapa -> CONTRATADO).
        human.execute(
            "CALL sp_contratar_candidato(%s)",
            (candidato_id,),
        )
        # Recupera result sets devueltos por el CALL.
        result = _fetch_all_resultsets(human)
        # Imprime filas del result set.
        imprimir_filas(result)

        # SELECT posterior: verifica la etapa después del UPDATE del procedimiento.
        despues = _info_candidato(human, candidato_id)
        print(f"  id={despues['id']} email={despues['email']} etapa={despues['etapa']}")

        # Pregunta COMMIT o ROLLBACK al operador.
        elegir_commit_o_rollback(conn)
    except MySQLError as err:
        # CALL falló en MySQL.
        conn.rollback()
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# PROCEDIMIENTO ALMACENADO: sp_registrar_capacitacion
# Objetivo: registrar una capacitación.
# Parámetros: IN p_nombre, p_descripcion, p_fechaInicio, p_cupoMaximo
# Tabla: Capacitacion (INSERT)
# Operación: CALL sp_registrar_capacitacion
# ============================================================
def registrar_capacitacion(
    nombre: str,
    descripcion: str,
    fecha_inicio: str,
    cupo_maximo: int,
) -> None:
    # Registra una capacitación invocando sp_registrar_capacitacion; el SP hace INSERT en Capacitacion.
    # nombre: nombre de la capacitación (p_nombre del SP).
    # descripcion: texto descriptivo (p_descripcion del SP).
    # fecha_inicio: fecha/hora de inicio en formato MySQL (p_fechaInicio del SP).
    # cupo_maximo: cupo máximo de inscripciones (p_cupoMaximo del SP).
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Tupla de parámetros enlazados al CALL sp_registrar_capacitacion en el mismo orden del SP.
    params = (nombre, descripcion, fecha_inicio, cupo_maximo)

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para CALL, lectura de result sets y SELECT de verificación.
    human = conn.cursor()
    try:
        # Inicia transacción explícita.
        conn.start_transaction()
        # ========================================================
        # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO
        # sp_registrar_capacitacion
        # ========================================================
        #
        # MySQL ejecuta el procedimiento, que realiza INSERT en la tabla Capacitacion
        # y devuelve el capacitacionId generado.
        human.execute(
            "CALL sp_registrar_capacitacion(%s, %s, %s, %s)",
            params,
        )
        # Recupera todos los result sets del CALL (incluye capacitacionId generado).
        result = _fetch_all_resultsets(human)
        # Imprime filas devueltas por el SP.
        imprimir_filas(result)

        # Extrae el id de la capacitación recién creada del primer result set.
        cap_id = result[0].get("capacitacionId") if result else None
        # Si el SP devolvió capacitacionId, confirma la fila con SELECT auxiliar.
        if cap_id:
            # SELECT de verificación: confirma la fila insertada en Capacitacion.
            cap = _info_capacitacion(human, int(cap_id))
            print(f"  Capacitacion: {cap}")

        # Pregunta COMMIT o ROLLBACK al operador.
        elegir_commit_o_rollback(conn, "Confirme COMMIT o ROLLBACK.")
    except MySQLError as err:
        # CALL falló en MySQL.
        conn.rollback()
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# PROCEDIMIENTO ALMACENADO: sp_consultar_saldo_vacaciones
# Objetivo: consultar saldo de vacaciones de un empleado.
# Parámetro: IN p_empleadoId INT
# Operación: CALL sp_consultar_saldo_vacaciones (solo lectura)
# ============================================================
def consultar_saldo_vacaciones(empleado_id: int) -> None:
    # Consulta saldo de vacaciones vía sp_consultar_saldo_vacaciones (solo lectura, sin transacción de mutación).
    # empleado_id: id del empleado (p_empleadoId del SP).
    # Abre conexión MySQL (no requiere confirmar_mutacion porque no muta datos).
    conn = conectar()
    # Cursor para CALL y lectura de result sets.
    human = conn.cursor()
    try:
        # ========================================================
        # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO
        # sp_consultar_saldo_vacaciones
        # ========================================================
        #
        # Operación de solo lectura: MySQL calcula y devuelve el saldo;
        # no modifica tablas. No se abre transacción de mutación.
        human.execute(
            "CALL sp_consultar_saldo_vacaciones(%s)",
            (empleado_id,),
        )
        # Recupera filas del result set devuelto por el SP.
        rows = _fetch_all_resultsets(human)
        # Imprime saldo y metadatos en consola.
        imprimir_filas(rows)
    except MySQLError as err:
        # Error al ejecutar el CALL de consulta.
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


# ============================================================
# PROCEDIMIENTO ALMACENADO: sp_aprobar_vacaciones
# Objetivo: aprobar solicitud de vacaciones pendiente.
# Parámetros: IN p_solicitudId, p_aprobadoPorId, p_respuesta
# Tablas: SolicitudPermiso, CalculoLaboralInfo (vía triggers)
# Operación: CALL sp_aprobar_vacaciones
#
# Flujo completo Python -> CALL -> UPDATE -> triggers:
#
# Python
#   ↓
# CALL sp_aprobar_vacaciones(p_solicitudId, p_aprobadoPorId, p_respuesta)
#   ↓
# MySQL ejecuta el cuerpo del procedimiento almacenado
#   ↓
# UPDATE SolicitudPermiso SET estado = 'APROBADA', ...
#   ↓
# MySQL detecta evento BEFORE UPDATE sobre SolicitudPermiso
#   ↓
# MySQL ejecuta automáticamente trg_solicitud_validar_saldo_vacaciones
#   ↓
# Si saldo suficiente: UPDATE permitido
# Si saldo insuficiente: SIGNAL SQLSTATE '45000' y el CALL falla
#   ↓
# MySQL detecta evento AFTER UPDATE sobre SolicitudPermiso
#   ↓
# MySQL ejecuta automáticamente trg_solicitud_descontar_vacaciones
#   ↓
# UPDATE de CalculoLaboralInfo.diasVacaciones (descuento de días)
#   ↓
# Python recibe result sets y puede verificar saldo con SELECT auxiliar
# ============================================================
def aprobar_vacaciones(
    solicitud_id: int,
    aprobado_por_id: int,
    respuesta: str,
) -> None:
    # Aprueba vacaciones invocando sp_aprobar_vacaciones; el UPDATE interno dispara triggers BEFORE y AFTER UPDATE.
    # solicitud_id: id de la solicitud (p_solicitudId del SP).
    # aprobado_por_id: id del aprobador RH (p_aprobadoPorId del SP).
    # respuesta: texto de resolución (p_respuesta del SP).
    # Solicita confirmación interactiva antes de mutar la base de datos.
    if not confirmar_mutacion():
        # El operador canceló: no se abre conexión ni transacción.
        print("Operación cancelada.")
        return

    # Tupla de parámetros enlazados al CALL sp_aprobar_vacaciones en el mismo orden del SP.
    params = (solicitud_id, aprobado_por_id, respuesta)

    # Abre conexión MySQL.
    conn = conectar()
    # Cursor para SELECT previos, CALL y lecturas posteriores.
    human = conn.cursor()
    try:
        # Inicia transacción explícita.
        conn.start_transaction()
        # SELECT previo: datos de la solicitud y empleado asociado.
        info = _info_solicitud(human, solicitud_id)
        # Si la solicitud no existe, revierte y termina sin CALL.
        if not info:
            conn.rollback()
            print(f"Solicitud {solicitud_id} no encontrada.")
            return

        # SELECT previo: saldo en CalculoLaboralInfo antes del CALL.
        saldo = _saldo_calculo_laboral(human, info["empleadoId"])
        print(f"  solicitudId: {info['id']}")
        print(
            f"  empleado: {info['nombre']} {info['apellidoPaterno']} "
            f"(id={info['empleadoId']})"
        )
        print(f"  tipo: {info['tipo']}  estado: {info['estado']}")
        print(f"  diasSolicitados: {info['diasSolicitados']}")
        print(f"  saldo CalculoLaboralInfo: {(saldo or {}).get('diasVacaciones', '—')}")

        try:
            # ========================================================
            # AQUÍ SE LLAMA AL PROCEDIMIENTO ALMACENADO
            # sp_aprobar_vacaciones
            # ========================================================
            #
            # El procedimiento ejecuta UPDATE sobre SolicitudPermiso.
            # MySQL detecta el evento UPDATE y ejecuta automáticamente:
            #   BEFORE UPDATE → trg_solicitud_validar_saldo_vacaciones
            #   AFTER UPDATE  → trg_solicitud_descontar_vacaciones
            #
            # IMPORTANTE:
            # Python NO invoca directamente a los triggers.
            human.execute(
                "CALL sp_aprobar_vacaciones(%s, %s, %s)",
                params,
            )
            # Recupera result sets devueltos por el CALL.
            result = _fetch_all_resultsets(human)
            # Imprime filas del result set.
            imprimir_filas(result)

            # SELECT posterior: estado de la solicitud tras el UPDATE del SP.
            info_despues = _info_solicitud(human, solicitud_id)
            # SELECT posterior: saldo en CalculoLaboralInfo tras el trigger AFTER UPDATE.
            saldo_despues = _saldo_calculo_laboral(human, info["empleadoId"])
            print(f"  SolicitudPermiso.estado: {info_despues.get('estado')}")
            print(f"  CalculoLaboralInfo antes: {(saldo or {}).get('diasVacaciones', '—')}")
            print(
                f"  CalculoLaboralInfo después: "
                f"{(saldo_despues or {}).get('diasVacaciones', '—')}"
            )
            # Pregunta COMMIT o ROLLBACK al operador.
            elegir_commit_o_rollback(conn, "Confirme COMMIT o ROLLBACK.")
        except MySQLError as err:
            # CALL falló (p. ej. saldo insuficiente vía SIGNAL del trigger BEFORE UPDATE).
            conn.rollback()
            print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Libera cursor y conexión.
        human.close()
        conn.close()


def listar_triggers() -> None:
    """SHOW TRIGGERS — verificación de instalación (solo lectura)."""
    # Lista triggers instalados en la base configurada y contrasta con REQUIRED_TRIGGERS.
    # No recibe parámetros; usa db_config() para obtener el nombre de la base.
    # Abre conexión MySQL (operación de solo lectura).
    conn = conectar()
    try:
        # Cursor para ejecutar SHOW TRIGGERS.
        human = conn.cursor()
        # Nombre de la base de datos activa según configuración del entorno.
        db = db_config()["database"]
        # ========================================================
        # CONSULTA DE METADATOS: SHOW TRIGGERS
        # ========================================================
        #
        # Python envía SHOW TRIGGERS a MySQL.
        # MySQL devuelve el catálogo de triggers instalados (nombre, evento, tabla).
        # Esta instrucción NO ejecuta ningún trigger; solo lista definiciones.
        human.execute(f"SHOW TRIGGERS FROM `{db}`")
        # Convierte todas las filas del result set en lista de dicts.
        rows = fetchall_dict(human)
        print(f"\nTriggers en `{db}` ({len(rows)}):")
        for r in rows:
            print(f"  - {r.get('Trigger')} ({r.get('Event')} {r.get('Table')})")
        # Conjunto de nombres de triggers encontrados en MySQL.
        instalados = {r.get("Trigger") for r in rows}
        print("\nTriggers requeridos:")
        # Compara cada trigger obligatorio contra los instalados.
        for nombre in REQUIRED_TRIGGERS:
            print(f"  [{'OK' if nombre in instalados else 'FALTA'}] {nombre}")
    finally:
        # Cierra la conexión (el cursor se libera al cerrar conn en este flujo).
        conn.close()


def mostrar_trigger(nombre: str) -> None:
    """SHOW CREATE TRIGGER — definición almacenada en MySQL."""
    # Muestra el SQL fuente de un trigger tal como está almacenado en MySQL.
    # nombre: identificador exacto del trigger (p. ej. trg_capacitacion_valida_cupo).
    # Abre conexión MySQL (operación de solo lectura).
    conn = conectar()
    try:
        # Cursor para ejecutar SHOW CREATE TRIGGER.
        human = conn.cursor()
        # ========================================================
        # CONSULTA DE METADATOS: SHOW CREATE TRIGGER
        # ========================================================
        #
        # Python envía SHOW CREATE TRIGGER a MySQL.
        # MySQL devuelve la definición DDL del trigger (SQL Original Statement).
        # Esta instrucción NO ejecuta el trigger; solo muestra su código almacenado.
        human.execute(f"SHOW CREATE TRIGGER `{nombre}`")
        # Lee la primera fila del result set (contiene la definición del trigger).
        row = fetchone_dict(human)
        # Si el trigger no existe, informa y termina.
        if not row:
            print(f"Trigger `{nombre}` no encontrado.")
            return
        # Extrae el SQL del trigger según la clave que devuelva el conector MySQL.
        sql = row.get("SQL Original Statement") or row.get("Create Trigger")
        print(f"\n=== {nombre} ===\n{sql}")
    except MySQLError as err:
        # Error al consultar metadatos (p. ej. trigger inexistente o permisos).
        print(f"Error MySQL: {mensaje_mysql(err)}")
    finally:
        # Cierra la conexión.
        conn.close()


def menu() -> None:
    # Bucle interactivo: presenta opciones y delega a la función correspondiente.
    while True:
        print("\n--- Triggers y procedimientos almacenados ---")
        print("1. Listar triggers instalados")
        print("2. Mostrar definición de trigger")
        print("3. Inscribir empleado en capacitación (INSERT)")
        print("4. Registrar postulación (INSERT Candidato)")
        print("5. Aprobar solicitud vacaciones (UPDATE)")
        print("6. Aprobar vacaciones con descuento (CALL sp_aprobar_vacaciones)")
        print("7. sp_inscribir_capacitacion")
        print("8. sp_contratar_candidato")
        print("9. sp_registrar_capacitacion")
        print("10. sp_consultar_saldo_vacaciones")
        print("11. sp_aprobar_vacaciones")
        print("0. Volver")

        op = input("\nOpción: ").strip()
        # Opción 0: sale del menú y retorna al caller.
        if op == "0":
            break
        # Opción 1: SHOW TRIGGERS + verificación de REQUIRED_TRIGGERS.
        if op == "1":
            listar_triggers()
        # Opción 2: SHOW CREATE TRIGGER del nombre ingresado.
        elif op == "2":
            mostrar_trigger(leer_texto("Nombre del trigger: "))
        # Opción 3: INSERT directo CapacitacionEmpleado (trigger BEFORE INSERT cupo).
        elif op == "3":
            inscribir_empleado_capacitacion(
                leer_entero("capacitacionId: "),
                leer_entero("empleadoId: "),
            )
        # Opción 4: INSERT directo Candidato (trigger BEFORE INSERT postulación única).
        elif op == "4":
            registrar_postulacion(
                leer_entero("vacanteId: "),
                leer_texto("email: "),
            )
        # Opción 5: UPDATE directo SolicitudPermiso (triggers BEFORE/AFTER UPDATE vacaciones).
        elif op == "5":
            aprobar_solicitud_vacaciones(leer_entero("solicitudId: "))
        # Opción 6: CALL sp_aprobar_vacaciones con lectura de saldo antes/después.
        elif op == "6":
            aprobar_vacaciones_con_descuento(
                leer_entero("solicitudId: "),
                leer_entero("rhId (aprobadoPorId): "),
            )
        # Opción 7: CALL sp_inscribir_capacitacion.
        elif op == "7":
            inscribir_capacitacion(
                leer_entero("capacitacionId: "),
                leer_entero("empleadoId: "),
            )
        # Opción 8: CALL sp_contratar_candidato.
        elif op == "8":
            contratar_candidato(leer_entero("candidatoId: "))
        # Opción 9: CALL sp_registrar_capacitacion.
        elif op == "9":
            registrar_capacitacion(
                leer_texto("nombre: ", "Capacitación Python"),
                leer_texto("descripcion: ", "Registro vía SP"),
                leer_texto("fechaInicio (YYYY-MM-DD HH:MM:SS): ", "2026-09-01 09:00:00"),
                leer_entero("cupoMaximo: "),
            )
        # Opción 10: CALL sp_consultar_saldo_vacaciones (solo lectura).
        elif op == "10":
            consultar_saldo_vacaciones(leer_entero("empleadoId: "))
        # Opción 11: CALL sp_aprobar_vacaciones con parámetros completos.
        elif op == "11":
            aprobar_vacaciones(
                leer_entero("solicitudId: "),
                leer_entero("aprobadoPorId: "),
                leer_texto("respuesta: ", "Aprobación vía SP"),
            )
        else:
            # Entrada no reconocida: vuelve a mostrar el menú.
            print("Opción no válida.")


if __name__ == "__main__":
    menu()
