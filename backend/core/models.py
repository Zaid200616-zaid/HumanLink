"""
Modelos Django unmanaged mapeados al schema Prisma/MySQL existente.
Tablas en PascalCase; Django no gestiona migraciones (managed=False).
"""
from django.db import models


# --- Enums (CharField en BD) ---

class EstadoVacante(models.TextChoices):
    ABIERTA = 'ABIERTA', 'Abierta'
    CERRADA = 'CERRADA', 'Cerrada'
    PAUSADA = 'PAUSADA', 'Pausada'


class EtapaContratacion(models.TextChoices):
    RECEPCION = 'RECEPCION', 'Recepción'
    REVISION_CV = 'REVISION_CV', 'Revisión CV'
    ENTREVISTA = 'ENTREVISTA', 'Entrevista'
    EVALUACION = 'EVALUACION', 'Evaluación'
    OFERTA = 'OFERTA', 'Oferta'
    CONTRATADO = 'CONTRATADO', 'Contratado'
    RECHAZADO = 'RECHAZADO', 'Rechazado'


class EstadoAsistencia(models.TextChoices):
    PUNTUAL = 'PUNTUAL', 'Puntual'
    RETARDO = 'RETARDO', 'Retardo'
    FALTA = 'FALTA', 'Falta'
    PERMISO = 'PERMISO', 'Permiso'
    VACACION = 'VACACION', 'Vacación'


class TipoSolicitud(models.TextChoices):
    PERMISO = 'PERMISO', 'Permiso'
    VACACION = 'VACACION', 'Vacación'


class EstadoSolicitud(models.TextChoices):
    PENDIENTE = 'PENDIENTE', 'Pendiente'
    APROBADA = 'APROBADA', 'Aprobada'
    RECHAZADA = 'RECHAZADA', 'Rechazada'


class AprobacionSupervisor(models.TextChoices):
    PENDIENTE = 'PENDIENTE', 'Pendiente'
    APROBADO = 'APROBADO', 'Aprobado'
    RECHAZADO = 'RECHAZADO', 'Rechazado'
    NO_APLICA = 'NO_APLICA', 'No aplica'


class EstadoQueja(models.TextChoices):
    REGISTRADA = 'REGISTRADA', 'Registrada'
    EN_REVISION = 'EN_REVISION', 'En revisión'
    EN_PROCESO = 'EN_PROCESO', 'En proceso'
    RESUELTA = 'RESUELTA', 'Resuelta'
    CERRADA = 'CERRADA', 'Cerrada'


class RespuestaEvento(models.TextChoices):
    PENDIENTE = 'PENDIENTE', 'Pendiente'
    CONFIRMADO = 'CONFIRMADO', 'Confirmado'
    RECHAZADO = 'RECHAZADO', 'Rechazado'


# --- RF-H07 Roles y permisos ---

class Rol(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191, unique=True)
    descripcion = models.TextField(null=True, blank=True)
    permisos = models.TextField()
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Rol'

    def __str__(self):
        return self.nombre


# --- RF-H01 Autenticación ---

class Usuario(models.Model):
    id = models.AutoField(primary_key=True)
    email = models.CharField(max_length=191, unique=True)
    passwordHash = models.CharField(max_length=191, db_column='passwordHash')
    activo = models.BooleanField(default=True)
    rol = models.ForeignKey(
        Rol,
        on_delete=models.RESTRICT,
        db_column='rolId',
        related_name='usuarios',
    )
    intentosFallidos = models.IntegerField(default=0, db_column='intentosFallidos')
    bloqueadoHasta = models.DateTimeField(null=True, blank=True, db_column='bloqueadoHasta')
    totpSecret = models.CharField(max_length=191, null=True, blank=True, db_column='totpSecret')
    totpEnabled = models.BooleanField(default=False, db_column='totpEnabled')
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Usuario'

    def __str__(self):
        return self.email


# --- Organización ---

class Organizacion(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    razonSocial = models.CharField(max_length=191, null=True, blank=True, db_column='razonSocial')
    rfc = models.CharField(max_length=191, null=True, blank=True)
    direccion = models.CharField(max_length=191, null=True, blank=True)
    telefono = models.CharField(max_length=191, null=True, blank=True)
    email = models.CharField(max_length=191, null=True, blank=True)
    activa = models.BooleanField(default=True)
    logoUrl = models.CharField(max_length=500, null=True, blank=True, db_column='logoUrl')
    nombreComercial = models.CharField(max_length=191, null=True, blank=True, db_column='nombreComercial')
    colorPrimario = models.CharField(max_length=191, null=True, blank=True, default='#3b82f6', db_column='colorPrimario')
    colorSecundario = models.CharField(max_length=191, null=True, blank=True, default='#22c55e', db_column='colorSecundario')
    colorAcento = models.CharField(max_length=191, null=True, blank=True, default='#8b5cf6', db_column='colorAcento')
    diasAnticipacionVacacion = models.IntegerField(default=7, db_column='diasAnticipacionVacacion')
    maxDiasConsecutivosVacacion = models.IntegerField(default=15, db_column='maxDiasConsecutivosVacacion')
    permitirHomeOffice = models.BooleanField(default=True, db_column='permitirHomeOffice')
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Organizacion'

    def __str__(self):
        return self.nombre


# --- RF-H19 Departamentos ---

class Departamento(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    descripcion = models.TextField(null=True, blank=True)
    organizacion = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        db_column='organizacionId',
        related_name='departamentos',
    )
    supervisor = models.ForeignKey(
        'Empleado',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='supervisorId',
        related_name='departamentos_supervisados',
    )
    ubicacion = models.CharField(max_length=191, null=True, blank=True)
    cantidadVacantes = models.IntegerField(default=0, db_column='cantidadVacantes')
    activo = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Departamento'

    def __str__(self):
        return self.nombre


# --- RF-H20 Turnos laborales ---

class Turno(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    horaInicio = models.CharField(max_length=191, db_column='horaInicio')
    horaFin = models.CharField(max_length=191, db_column='horaFin')
    descripcion = models.TextField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Turno'

    def __str__(self):
        return self.nombre


# --- RF-H02 Empleados ---

class Empleado(models.Model):
    id = models.AutoField(primary_key=True)
    numeroEmpleado = models.CharField(max_length=191, unique=True, db_column='numeroEmpleado')
    nombre = models.CharField(max_length=191)
    apellidoPaterno = models.CharField(max_length=191, db_column='apellidoPaterno')
    apellidoMaterno = models.CharField(max_length=191, null=True, blank=True, db_column='apellidoMaterno')
    email = models.CharField(max_length=191, unique=True)
    curp = models.CharField(max_length=191, null=True, blank=True, unique=True)
    rfc = models.CharField(max_length=191, null=True, blank=True, unique=True)
    telefono = models.CharField(max_length=191, null=True, blank=True)
    fechaNacimiento = models.DateTimeField(null=True, blank=True, db_column='fechaNacimiento')
    fechaIngreso = models.DateTimeField(db_column='fechaIngreso')
    puesto = models.CharField(max_length=191)
    salario = models.DecimalField(max_digits=65, decimal_places=30, null=True, blank=True)
    activo = models.BooleanField(default=True)
    fotoUrl = models.CharField(max_length=500, null=True, blank=True, db_column='fotoUrl')
    diasVacacionesExtra = models.IntegerField(default=0, db_column='diasVacacionesExtra')
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='departamentoId',
        related_name='empleados',
    )
    turno = models.ForeignKey(
        Turno,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='turnoId',
        related_name='empleados',
    )
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='usuarioId',
        related_name='empleado',
    )
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Empleado'

    def __str__(self):
        return f'{self.nombre} {self.apellidoPaterno}'


# --- RF-H03 Vacantes ---

class Vacante(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=191)
    descripcion = models.TextField()
    requisitos = models.TextField(null=True, blank=True)
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.CASCADE,
        db_column='departamentoId',
        related_name='vacantes',
    )
    cupoTotal = models.IntegerField(default=1, db_column='cupoTotal')
    cupoDisponible = models.IntegerField(default=1, db_column='cupoDisponible')
    cupoBloqueado = models.IntegerField(default=0, db_column='cupoBloqueado')
    estado = models.CharField(max_length=20, choices=EstadoVacante.choices, default=EstadoVacante.ABIERTA)
    fechaPublicacion = models.DateTimeField(db_column='fechaPublicacion')
    fechaCierre = models.DateTimeField(null=True, blank=True, db_column='fechaCierre')
    modalidad = models.CharField(max_length=191, null=True, blank=True)
    tipoEmpleo = models.CharField(max_length=191, null=True, blank=True, db_column='tipoEmpleo')
    ubicacion = models.CharField(max_length=191, null=True, blank=True)
    salario = models.CharField(max_length=191, null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Vacante'

    def __str__(self):
        return self.titulo


# --- RF-H04 Contratación ---

class Candidato(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    apellidoPaterno = models.CharField(max_length=191, db_column='apellidoPaterno')
    apellidoMaterno = models.CharField(max_length=191, null=True, blank=True, db_column='apellidoMaterno')
    email = models.CharField(max_length=191)
    telefono = models.CharField(max_length=191, null=True, blank=True)
    curp = models.CharField(max_length=191, null=True, blank=True)
    rfc = models.CharField(max_length=191, null=True, blank=True)
    direccion = models.TextField(null=True, blank=True)
    escolaridad = models.CharField(max_length=191, null=True, blank=True)
    experiencia = models.TextField(null=True, blank=True)
    cartaPresentacion = models.TextField(null=True, blank=True, db_column='cartaPresentacion')
    curriculum = models.CharField(max_length=500, null=True, blank=True)
    vacante = models.ForeignKey(
        Vacante,
        on_delete=models.CASCADE,
        db_column='vacanteId',
        related_name='candidatos',
    )
    etapa = models.CharField(
        max_length=20,
        choices=EtapaContratacion.choices,
        default=EtapaContratacion.RECEPCION,
    )
    notas = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Candidato'

    def __str__(self):
        return f'{self.nombre} {self.apellidoPaterno}'


class ContactoLead(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    email = models.CharField(max_length=191)
    asunto = models.CharField(max_length=191)
    mensaje = models.TextField()
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'ContactoLead'

    def __str__(self):
        return self.asunto


# --- RF-H05 Capacitaciones ---

class Capacitacion(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    descripcion = models.TextField(null=True, blank=True)
    instructor = models.CharField(max_length=191, null=True, blank=True)
    fechaInicio = models.DateTimeField(db_column='fechaInicio')
    fechaFin = models.DateTimeField(null=True, blank=True, db_column='fechaFin')
    cupoMaximo = models.IntegerField(default=30, db_column='cupoMaximo')
    estado = models.CharField(max_length=191, default='PROGRAMADA')
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Capacitacion'

    def __str__(self):
        return self.nombre


class CapacitacionEmpleado(models.Model):
    id = models.AutoField(primary_key=True)
    capacitacion = models.ForeignKey(
        Capacitacion,
        on_delete=models.CASCADE,
        db_column='capacitacionId',
        related_name='empleados',
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='capacitaciones',
    )
    estado = models.CharField(max_length=191, default='INSCRITO')
    calificacion = models.CharField(max_length=191, null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'CapacitacionEmpleado'
        unique_together = (('capacitacion', 'empleado'),)

    def __str__(self):
        return f'{self.empleado_id} - {self.capacitacion_id}'


# --- RF-H06 Asistencias ---

class Asistencia(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='asistencias',
    )
    fecha = models.DateTimeField()
    horaEntrada = models.CharField(max_length=191, null=True, blank=True, db_column='horaEntrada')
    horaSalida = models.CharField(max_length=191, null=True, blank=True, db_column='horaSalida')
    turnoNombre = models.CharField(max_length=191, null=True, blank=True, db_column='turnoNombre')
    estado = models.CharField(
        max_length=20,
        choices=EstadoAsistencia.choices,
        default=EstadoAsistencia.PUNTUAL,
    )
    notas = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Asistencia'
        unique_together = (('empleado', 'fecha'),)

    def __str__(self):
        return f'{self.empleado_id} - {self.fecha}'


# --- RF-H13 Permisos y vacaciones ---

class SolicitudPermiso(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='solicitudes',
    )
    tipo = models.CharField(max_length=20, choices=TipoSolicitud.choices)
    fechaInicio = models.DateTimeField(db_column='fechaInicio')
    fechaFin = models.DateTimeField(db_column='fechaFin')
    diasSolicitados = models.IntegerField(default=1, db_column='diasSolicitados')
    motivo = models.TextField()
    estado = models.CharField(
        max_length=20,
        choices=EstadoSolicitud.choices,
        default=EstadoSolicitud.PENDIENTE,
    )
    aprobacionSupervisor = models.CharField(
        max_length=20,
        choices=AprobacionSupervisor.choices,
        default=AprobacionSupervisor.PENDIENTE,
        db_column='aprobacionSupervisor',
    )
    supervisorRespuesta = models.TextField(null=True, blank=True, db_column='supervisorRespuesta')
    supervisorAprobadoPorId = models.IntegerField(null=True, blank=True, db_column='supervisorAprobadoPorId')
    supervisorFechaResolucion = models.DateTimeField(null=True, blank=True, db_column='supervisorFechaResolucion')
    respuesta = models.TextField(null=True, blank=True)
    aprobadoPorId = models.IntegerField(null=True, blank=True, db_column='aprobadoPorId')
    fechaResolucion = models.DateTimeField(null=True, blank=True, db_column='fechaResolucion')
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'SolicitudPermiso'

    def __str__(self):
        return f'{self.empleado_id} - {self.tipo}'


# --- RF-H11 Evaluaciones ---

class EvaluacionDesempeno(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='evaluaciones',
    )
    evaluador = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='evaluadorId',
        related_name='evaluaciones_hechas',
    )
    tipo = models.CharField(max_length=191, default='DESEMPENO')
    periodo = models.CharField(max_length=191)
    comentarios = models.TextField()
    puntaje = models.IntegerField(null=True, blank=True)
    fecha = models.DateTimeField()
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'EvaluacionDesempeno'

    def __str__(self):
        return f'{self.empleado_id} - {self.periodo}'


# --- RF-H16 Quejas laborales ---

class QuejaLaboral(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='quejas',
    )
    asunto = models.CharField(max_length=191)
    descripcion = models.TextField()
    estado = models.CharField(
        max_length=20,
        choices=EstadoQueja.choices,
        default=EstadoQueja.REGISTRADA,
    )
    seguimiento = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'QuejaLaboral'

    def __str__(self):
        return self.asunto


class QuejaHistorial(models.Model):
    id = models.AutoField(primary_key=True)
    queja = models.ForeignKey(
        QuejaLaboral,
        on_delete=models.CASCADE,
        db_column='quejaId',
        related_name='historial',
    )
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.RESTRICT,
        db_column='usuarioId',
        related_name='queja_historial',
    )
    estadoAnterior = models.CharField(max_length=191, db_column='estadoAnterior')
    estadoNuevo = models.CharField(max_length=191, db_column='estadoNuevo')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'QuejaHistorial'

    def __str__(self):
        return f'Queja {self.queja_id} - {self.estadoNuevo}'


# --- RF-H17 Eventos organizacionales ---

class EventoOrganizacional(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=191)
    descripcion = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField()
    ubicacion = models.CharField(max_length=191, null=True, blank=True)
    inscripcionAbierta = models.BooleanField(default=True, db_column='inscripcionAbierta')
    activo = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'EventoOrganizacional'

    def __str__(self):
        return self.titulo


class EventoRespuesta(models.Model):
    id = models.AutoField(primary_key=True)
    evento = models.ForeignKey(
        EventoOrganizacional,
        on_delete=models.CASCADE,
        db_column='eventoId',
        related_name='respuestas',
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='eventos_respuesta',
    )
    respuesta = models.CharField(
        max_length=20,
        choices=RespuestaEvento.choices,
        default=RespuestaEvento.PENDIENTE,
    )
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'EventoRespuesta'
        unique_together = (('evento', 'empleado'),)

    def __str__(self):
        return f'{self.evento_id} - {self.empleado_id}'


# --- RF-H18 Documentos ---

class Documento(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='documentos',
    )
    tipo = models.CharField(max_length=191)
    nombre = models.CharField(max_length=191)
    rutaArchivo = models.CharField(max_length=500, db_column='rutaArchivo')
    observaciones = models.TextField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    version = models.IntegerField(default=1)
    vencimiento = models.DateTimeField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'Documento'

    def __str__(self):
        return self.nombre


# --- RF-H08 Reportes ---

class HistorialReporte(models.Model):
    id = models.AutoField(primary_key=True)
    mes = models.CharField(max_length=191)
    tipo = models.CharField(max_length=191)
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='usuarioId',
        related_name='historial_reportes',
    )
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'HistorialReporte'

    def __str__(self):
        return f'{self.tipo} - {self.mes}'


# --- RF-H10 Notificaciones ---

class Notificacion(models.Model):
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='usuarioId',
        related_name='notificaciones',
    )
    titulo = models.CharField(max_length=191)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=191)
    leida = models.BooleanField(default=False)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Notificacion'

    def __str__(self):
        return self.titulo


# --- Auditoría ---

class AuditoriaLog(models.Model):
    id = models.AutoField(primary_key=True)
    usuarioId = models.IntegerField(null=True, blank=True, db_column='usuarioId')
    email = models.CharField(max_length=191, null=True, blank=True)
    accion = models.CharField(max_length=191)
    modulo = models.CharField(max_length=191)
    detalle = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'AuditoriaLog'

    def __str__(self):
        return f'{self.modulo} - {self.accion}'


# --- OKR ---

class ObjetivoOKR(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='objetivos',
    )
    titulo = models.CharField(max_length=191)
    descripcion = models.TextField(null=True, blank=True)
    periodo = models.CharField(max_length=191)
    meta = models.IntegerField(default=100)
    progreso = models.IntegerField(default=0)
    estado = models.CharField(max_length=191, default='ACTIVO')
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'ObjetivoOKR'

    def __str__(self):
        return self.titulo


# --- Encuestas ---

class Encuesta(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=191)
    descripcion = models.TextField(null=True, blank=True)
    anonima = models.BooleanField(default=True)
    activa = models.BooleanField(default=True)
    preguntas = models.TextField()
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Encuesta'

    def __str__(self):
        return self.titulo


class EncuestaRespuesta(models.Model):
    id = models.AutoField(primary_key=True)
    encuesta = models.ForeignKey(
        Encuesta,
        on_delete=models.CASCADE,
        db_column='encuestaId',
        related_name='respuestas',
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='empleadoId',
        related_name='encuestas_respuesta',
    )
    respuestas = models.TextField()
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'EncuestaRespuesta'

    def __str__(self):
        return f'Encuesta {self.encuesta_id}'


# --- Home office ---

class RegistroHomeOffice(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='registros_home_office',
    )
    fecha = models.DateTimeField()
    motivo = models.CharField(max_length=191, null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'RegistroHomeOffice'
        unique_together = (('empleado', 'fecha'),)

    def __str__(self):
        return f'{self.empleado_id} - {self.fecha}'


# --- Tickets de soporte ---

class TicketSoporte(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='tickets',
    )
    asunto = models.CharField(max_length=191)
    categoria = models.CharField(max_length=191, default='GENERAL')
    prioridad = models.CharField(max_length=191, default='MEDIA')
    estado = models.CharField(max_length=191, default='ABIERTO')
    asignadoA = models.CharField(max_length=191, null=True, blank=True, db_column='asignadoA')
    slaHoras = models.IntegerField(default=48, db_column='slaHoras')
    createdAt = models.DateTimeField(db_column='createdAt')
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'TicketSoporte'

    def __str__(self):
        return self.asunto


class TicketMensaje(models.Model):
    id = models.AutoField(primary_key=True)
    ticket = models.ForeignKey(
        TicketSoporte,
        on_delete=models.CASCADE,
        db_column='ticketId',
        related_name='mensajes',
    )
    autorId = models.IntegerField(null=True, blank=True, db_column='autorId')
    autorNombre = models.CharField(max_length=191, db_column='autorNombre')
    mensaje = models.TextField()
    esRH = models.BooleanField(default=False, db_column='esRH')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'TicketMensaje'

    def __str__(self):
        return f'Ticket {self.ticket_id}'


# --- Firmas digitales ---

class FirmaDocumento(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='firmas',
    )
    documento = models.CharField(max_length=191)
    version = models.CharField(max_length=191, default='1.0')
    firmado = models.BooleanField(default=False)
    firmaHash = models.CharField(max_length=191, null=True, blank=True, db_column='firmaHash')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'FirmaDocumento'
        unique_together = (('empleado', 'documento', 'version'),)

    def __str__(self):
        return f'{self.documento} v{self.version}'


# --- Onboarding ---

class OnboardingPlantilla(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    tareas = models.TextField()
    activa = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'OnboardingPlantilla'

    def __str__(self):
        return self.nombre


class OnboardingTareaEmpleado(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='onboarding_tareas',
    )
    tarea = models.CharField(max_length=500)
    completada = models.BooleanField(default=False)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'OnboardingTareaEmpleado'

    def __str__(self):
        return self.tarea[:50]


# --- Offboarding ---

class Offboarding(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='offboardings',
    )
    motivo = models.CharField(max_length=191)
    fechaBaja = models.DateTimeField(db_column='fechaBaja')
    notas = models.TextField(null=True, blank=True)
    checklist = models.TextField(null=True, blank=True)
    completado = models.BooleanField(default=False)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Offboarding'

    def __str__(self):
        return f'Offboarding {self.empleado_id}'


# --- Recuperación de contraseña ---

class TokenRecuperacion(models.Model):
    id = models.AutoField(primary_key=True)
    email = models.CharField(max_length=191)
    token = models.CharField(max_length=191, unique=True)
    usado = models.BooleanField(default=False)
    expiresAt = models.DateTimeField(db_column='expiresAt')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'TokenRecuperacion'

    def __str__(self):
        return self.email


# --- Preferencias usuario ---

class PreferenciaUsuario(models.Model):
    id = models.AutoField(primary_key=True)
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        db_column='usuarioId',
        related_name='preferencias',
    )
    tema = models.CharField(max_length=191, default='light')
    idioma = models.CharField(max_length=191, default='es')

    class Meta:
        managed = False
        db_table = 'PreferenciaUsuario'

    def __str__(self):
        return f'Preferencias {self.usuario_id}'


# --- Sesiones ---

class SesionUsuario(models.Model):
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='usuarioId',
        related_name='sesiones',
    )
    tokenHash = models.CharField(max_length=191, null=True, blank=True, db_column='tokenHash')
    ip = models.CharField(max_length=191, null=True, blank=True)
    userAgent = models.CharField(max_length=500, null=True, blank=True, db_column='userAgent')
    activa = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')
    expiresAt = models.DateTimeField(null=True, blank=True, db_column='expiresAt')

    class Meta:
        managed = False
        db_table = 'SesionUsuario'

    def __str__(self):
        return f'Sesión {self.usuario_id}'


# --- Email log ---

class EmailLog(models.Model):
    id = models.AutoField(primary_key=True)
    destino = models.CharField(max_length=191)
    asunto = models.CharField(max_length=191)
    cuerpo = models.TextField()
    enviado = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'EmailLog'

    def __str__(self):
        return self.asunto


# --- Bolsa de horas ---

class BolsaHoras(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='bolsa_horas',
    )
    horas = models.FloatField()
    tipo = models.CharField(max_length=191)
    motivo = models.CharField(max_length=191, null=True, blank=True)
    fecha = models.DateTimeField()
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'BolsaHoras'

    def __str__(self):
        return f'{self.empleado_id} - {self.horas}h'


# --- Activos asignados ---

class ActivoAsignado(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='activos',
    )
    nombre = models.CharField(max_length=191)
    serial = models.CharField(max_length=191, null=True, blank=True)
    estado = models.CharField(max_length=191, default='ASIGNADO')
    fechaAsignacion = models.DateTimeField(db_column='fechaAsignacion')
    fechaDevolucion = models.DateTimeField(null=True, blank=True, db_column='fechaDevolucion')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'ActivoAsignado'

    def __str__(self):
        return self.nombre


# --- Beneficios ---

class BeneficioEmpleado(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='beneficios',
    )
    tipo = models.CharField(max_length=191)
    descripcion = models.TextField(null=True, blank=True)
    vigenciaHasta = models.DateTimeField(null=True, blank=True, db_column='vigenciaHasta')
    activo = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'BeneficioEmpleado'

    def __str__(self):
        return f'{self.empleado_id} - {self.tipo}'


# --- Incapacidades ---

class Incapacidad(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='incapacidades',
    )
    tipo = models.CharField(max_length=191)
    fechaInicio = models.DateTimeField(db_column='fechaInicio')
    fechaFin = models.DateTimeField(db_column='fechaFin')
    certificado = models.CharField(max_length=500, null=True, blank=True)
    estado = models.CharField(max_length=191, default='ACTIVA')
    notas = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Incapacidad'

    def __str__(self):
        return f'{self.empleado_id} - {self.tipo}'


# --- Headcount ---

class HeadcountPlan(models.Model):
    id = models.AutoField(primary_key=True)
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.CASCADE,
        db_column='departamentoId',
        related_name='headcount_plans',
    )
    anio = models.IntegerField()
    mes = models.IntegerField()
    planeada = models.IntegerField()
    notas = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'HeadcountPlan'
        unique_together = (('departamento', 'anio', 'mes'),)

    def __str__(self):
        return f'{self.departamento_id} - {self.anio}/{self.mes}'


# --- Competencias ---

class Competencia(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191, unique=True)
    descripcion = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Competencia'

    def __str__(self):
        return self.nombre


class CompetenciaEmpleado(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='competencias',
    )
    competencia = models.ForeignKey(
        Competencia,
        on_delete=models.CASCADE,
        db_column='competenciaId',
        related_name='empleados',
    )
    nivel = models.IntegerField(default=1)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'CompetenciaEmpleado'
        unique_together = (('empleado', 'competencia'),)

    def __str__(self):
        return f'{self.empleado_id} - {self.competencia_id}'


# --- Plan de carrera ---

class PlanCarrera(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='planes_carrera',
    )
    puestoObjetivo = models.CharField(max_length=191, db_column='puestoObjetivo')
    plazo = models.CharField(max_length=191)
    notas = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=191, default='ACTIVO')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'PlanCarrera'

    def __str__(self):
        return f'{self.empleado_id} - {self.puestoObjetivo}'


# --- Reconocimientos ---

class Reconocimiento(models.Model):
    id = models.AutoField(primary_key=True)
    de_empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='deEmpleadoId',
        related_name='kudos_enviados',
    )
    a_empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='aEmpleadoId',
        related_name='kudos_recibidos',
    )
    mensaje = models.TextField()
    badge = models.CharField(max_length=191, default='ESTRELLA')
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Reconocimiento'

    def __str__(self):
        return f'{self.de_empleado_id} -> {self.a_empleado_id}'


# --- Comunicados ---

class Comunicado(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=191)
    contenido = models.TextField()
    autor = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        db_column='autorId',
        related_name='comunicados',
    )
    fijado = models.BooleanField(default=False)
    publicado = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'Comunicado'

    def __str__(self):
        return self.titulo


# --- Workflows ---

class WorkflowAprobacion(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=191)
    modulo = models.CharField(max_length=191)
    niveles = models.TextField()
    activo = models.BooleanField(default=True)
    createdAt = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'WorkflowAprobacion'

    def __str__(self):
        return self.nombre


# --- Cálculo laboral informativo ---

class CalculoLaboralInfo(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.OneToOneField(
        Empleado,
        on_delete=models.CASCADE,
        db_column='empleadoId',
        related_name='calculo_laboral',
    )
    diasVacaciones = models.IntegerField(default=0, db_column='diasVacaciones')
    primaVacacionalPct = models.FloatField(default=25, db_column='primaVacacionalPct')
    aguinaldoDias = models.IntegerField(default=15, db_column='aguinaldoDias')
    notas = models.TextField(null=True, blank=True)
    updatedAt = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'CalculoLaboralInfo'

    def __str__(self):
        return f'Cálculo laboral {self.empleado_id}'
