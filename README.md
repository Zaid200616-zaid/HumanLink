# HumanLink – Sistema de Gestión de Recursos Humanos



Aplicación web completa con APIs REST, **MySQL**, autenticación JWT, roles granulares y módulos RH alineados a RF-H01–RF-H20. Proyecto académico ERS IEEE 830 (UTT · Grupo 5B DSM).



> **Nota:** No incluye nómina ni pagos. Prima/aguinaldo es solo informativo (LFT).



---



## Inicio rápido (Windows)



```cmd

cd c:\Users\guill\Downloads\HumanEquipo

npm install

copy .env.example .env

npm run db:setup

npm run dev

```



Abrir **http://localhost:3000**



| Comando | Descripción |

|---------|-------------|

| `npm run dev` | Servidor de desarrollo |

| `npm run db:setup` | Sincronizar schema + seed demo |

| `npm run build` | Compilar producción |

| `npm test` | Tests unitarios (TOTP, vacaciones, rate limit) |



---



## Usuarios de prueba



Contraseña para **todos**: `HumanLink2026!`



| Rol | Correo |

|-----|--------|

| Administrador | `admin@humanlink.mx` |

| Recursos Humanos | `0324108067@ut-tijuana.edu.mx` |

| Supervisor | `carlos.ramirez@humanlink.mx` |

| Empleado | `0324108126@ut-tijuana.edu.mx` |

| Empleada | `0324108073@ut-tijuana.edu.mx` |



En login hay **acceso rápido por rol**. También: recuperar contraseña (`/recuperar`), 2FA demo (activar en Mi Perfil), dark mode, búsqueda global.



---



## Módulos del sistema



### Inicio

Dashboard por rol · Mi Perfil (foto, contraseña, 2FA, sesiones, export JSON) · Notificaciones + email log



### Organización

Organizaciones · Departamentos · Turnos · Organigrama · Personalización (logo/colores) · Workflows · Permisos por rol



### Personal

Empleados · Asistencias (import JSON) · Permisos/Vacaciones (supervisor → RH, expediente LFT) · Calendario vacaciones · Onboarding/Offboarding · Home office · Bolsa de horas · Activos · Incapacidades · Beneficios · Headcount · Cálculo laboral informativo



### Reclutamiento

Vacantes · Candidatos (contratación crea empleado + usuario + onboarding)



### Desarrollo

Capacitaciones · Evaluaciones · OKRs · Eventos · Encuestas clima (crear + resultados) · Plan de carrera · Competencias · Kudos



### Comunicación y soporte

Comunicados · Quejas · Tickets (prioridad, SLA, asignación) · Firmas digitales · Políticas RH



### Administración

Documentos (subida + vencimientos) · Reportes (export CSV) · Auditoría · Log emails · API docs



---



## Características técnicas



- **Stack:** Next.js 15, React 19, Prisma, **MySQL 8+**, Tailwind 4

- **Auth:** JWT en cookie httpOnly, sesiones en BD, **2FA real TOTP (RFC 6238)** con QR para Google Authenticator/Authy, rate limiting en middleware

- **Notificaciones:** In-app + email real vía **nodemailer** (`SMTP_ENABLED=true`); si está apagado, se registra en `EmailLog`

- **Recuperación de contraseña:** enlace enviado por correo (o token visible en modo demo)

- **Workflows:** cadenas de aprobación configurables aplicadas a solicitudes

- **Alertas:** documentos por vencer y tickets fuera de SLA (botón en Reportes o cron externo a `/api/alertas`)

- **Reportes:** gráficas de barras + exportación **CSV y Excel (.xlsx)**

- **Archivos:** Subida local en `uploads/` (documentos, logos, fotos)

- **APIs:** 70+ rutas REST bajo `/api/`



---



## Estructura



```

HumanEquipo/

├── prisma/schema.prisma   # ~50 modelos

├── prisma/seed.ts         # Datos demo completos

├── src/app/(dashboard)/   # UI por módulo

├── src/app/api/           # REST APIs

├── src/lib/               # auth, vacaciones, email, auditoría…

├── tests/                 # Tests unitarios

└── uploads/               # Archivos subidos (gitignored)

```



---



## Variables de entorno (.env)



```

DATABASE_URL="mysql://humanlink:humanlink2026@localhost:3306/humanlink"

JWT_SECRET="tu-secreto-largo"

SMTP_ENABLED="false"   # true para log en consola de emails

```

**MySQL — primera vez:**

```bash
mysql -u root -p < database/setup_mysql.sql
npm run db:setup
```



---



## Equipo



Ochoa Calte Guillermo Zaid · Gutiérrez Rivas Ernesto · De Jesús Martínez Adad Ramses · Olaiz Ventura Carol Anne Selene

