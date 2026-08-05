# HumanLink — Sistema de Gestión de Recursos Humanos

Aplicación web con APIs REST, **MySQL/MariaDB**, autenticación JWT, roles granulares y módulos RH alineados a **RF-H01–RF-H20**. Proyecto académico ERS IEEE 830 (UTT · Grupo 5B DSM).

> **Nota:** No incluye nómina ni pagos. Prima/aguinaldo es solo informativo (LFT).

**Stack:** Next.js 15 · React 19 · Prisma · MySQL 8+ / MariaDB 10.6+ · Tailwind 4

---

## Requisitos previos

| Herramienta | Versión recomendada | Verificar |
|-------------|---------------------|-----------|
| **Node.js** | 20 LTS o 22 LTS | `node -v` |
| **npm** | 10+ (incluido con Node) | `npm -v` |
| **MySQL** o **MariaDB** | MySQL 8.0+ / MariaDB 10.6+ | `mysql --version` |
| **Git** | Cualquier versión reciente | `git --version` |

### Instalar requisitos

- **Node.js:** [https://nodejs.org](https://nodejs.org) (descargar LTS).
- **MySQL:** [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)  
  **MariaDB:** [https://mariadb.org/download/](https://mariadb.org/download/)
- **Git:** [https://git-scm.com/downloads](https://git-scm.com/downloads)

Asegúrese de que el servicio MySQL/MariaDB esté **en ejecución** antes de migrar o iniciar la app.

---

## Instalación rápida

Comandos para dejar el proyecto funcionando **desde cero**. Sustituya `HumanLink` por la URL o carpeta de su repositorio.

### Windows (CMD o Git Bash)

```cmd
git clone https://github.com/Zaid200616-zaid/HumanLink.git
cd HumanLink
npm install
copy .env.example .env
mysql -u root -p < database\setup_mysql.sql
npm run db:setup
npm run dev
```

### Windows (PowerShell)

```powershell
git clone https://github.com/Zaid200616-zaid/HumanLink.git
cd HumanLink
npm install
Copy-Item .env.example .env
Get-Content database\setup_mysql.sql | mysql -u root -p
npm run db:setup
npm run dev
```

### Linux / macOS

```bash
git clone https://github.com/Zaid200616-zaid/HumanLink.git
cd HumanLink
npm install
cp .env.example .env
mysql -u root -p < database/setup_mysql.sql
npm run db:setup
npm run dev
```

Abrir en el navegador: **http://localhost:3000**

Contraseña de todos los usuarios demo: **`HumanLink2026!`**

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/Zaid200616-zaid/HumanLink.git
cd HumanLink
```

Si ya tiene el proyecto localmente, actualice dependencias con `git pull` y `npm install`.

### 2. Instalar dependencias Node

```bash
npm install
```

Este comando instala paquetes npm y ejecuta `prisma generate` automáticamente (`postinstall`).

**Compatibilidad:** Todas las dependencias (`next`, `prisma`, `tsx`, `bcryptjs`, etc.) son multiplataforma. No hay rutas absolutas ni binarios exclusivos de Windows o Linux en el código de la aplicación.

### 3. Configurar variables de entorno

Copie el archivo de ejemplo:

| Sistema | Comando |
|---------|---------|
| Windows CMD | `copy .env.example .env` |
| Windows PowerShell | `Copy-Item .env.example .env` |
| Linux / macOS | `cp .env.example .env` |

Edite `.env` y revise al menos estas variables:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí | Conexión MySQL/MariaDB. Ej.: `mysql://humanlink:humanlink2026@localhost:3306/humanlink` |
| `JWT_SECRET` | Sí | Secreto para tokens JWT. Cambiar en producción. |
| `APP_URL` | Recomendada | URL base para enlaces en correos. Demo: `http://localhost:3000` |
| `SMTP_ENABLED` | No | `false` = solo registra en `EmailLog` (demo). `true` = envía correo real. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No | Configuración SMTP si `SMTP_ENABLED=true` |
| `FORCE_HTTPS` | No | En producción con TLS. En local puede ser `false`. |

### 4. Crear la base de datos

El script `database/setup_mysql.sql` crea la base `humanlink`, el usuario `humanlink` y otorga permisos.

**Linux / macOS / Git Bash (Windows):**

```bash
mysql -u root -p < database/setup_mysql.sql
```

**Windows CMD:**

```cmd
mysql -u root -p < database\setup_mysql.sql
```

**Windows PowerShell:**

```powershell
Get-Content database\setup_mysql.sql | mysql -u root -p
```

**Alternativa (cliente interactivo, cualquier SO):**

```sql
mysql -u root -p
source database/setup_mysql.sql;
exit;
```

Si usa otras credenciales, actualice `DATABASE_URL` en `.env` para que coincidan.

### 5. Ejecutar migraciones Prisma

Aplica el esquema definido en `prisma/migrations/`:

```bash
npm run db:migrate
```

Equivalente a `npx prisma migrate deploy`.

Para desarrollo con historial de migraciones interactivo:

```bash
npm run db:migrate:dev
```

### 6. Cargar datos de demostración (seed)

```bash
npm run db:seed
```

O migraciones + seed en un solo paso:

```bash
npm run db:setup
```

### 7. Scripts SQL académicos (opcional)

Artefactos de **Bases de Datos Avanzadas** (triggers, SP, vistas). **No son necesarios** para que HumanLink funcione; la app opera igual sin ellos.

Ejecutar **después** de `npm run db:setup`:

```bash
mysql -u humanlink -p humanlink < database/triggers_mysql.sql
mysql -u humanlink -p humanlink < database/procedures_mysql.sql
mysql -u humanlink -p humanlink < database/views_mysql.sql
```

Consultas avanzadas (solo demostración, ejecutar en Workbench o CLI):

```bash
mysql -u humanlink -p humanlink < database/advanced_queries.sql
```

Documentación detallada: [`database/README.md`](database/README.md) y [`database/demostracion_exposicion.md`](database/demostracion_exposicion.md).

### 8. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app escucha en **todas las interfaces** (`0.0.0.0`), útil para probar desde otra máquina en la red local.

Acceso: **http://localhost:3000**

---

## Usuarios de prueba (seed)

Contraseña para **todos**: `HumanLink2026!`

| Rol | Correo |
|-----|--------|
| Administrador | `admin@humanlink.mx` |
| Recursos Humanos | `0324108067@ut-tijuana.edu.mx` |
| Supervisor | `carlos.ramirez@humanlink.mx` |
| Empleado | `0324108126@ut-tijuana.edu.mx` |
| Empleada | `0324108073@ut-tijuana.edu.mx` |

Otros usuarios demo: `0324108169@ut-tijuana.edu.mx` (Admin/Director), `maria.lopez@humanlink.mx` (RH), `ana.martinez@humanlink.mx`, `luis.fernandez@humanlink.mx`.

En el login hay **acceso rápido por rol**. También: recuperar contraseña (`/recuperar`), 2FA demo, dark mode, búsqueda global.

---

## Comandos npm útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Compilar para producción |
| `npm start` | Servidor de producción (tras `build`) |
| `npm run db:setup` | Generate + migraciones + seed |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:seed` | Datos demo |
| `npm run db:generate` | Regenerar Prisma Client |
| `npm run db:seed-carga` | Carga masiva RNF13 (requiere seed previo) |
| `npm test` | Tests unitarios |

---

## Solución de problemas

### Puerto 3000 ocupado

```bash
npm run dev -- -p 3001
```

Acceda en `http://localhost:3001` y actualice `APP_URL` si usa recuperación de contraseña.

**Windows:** `netstat -ano | findstr :3000`  
**Linux:** `ss -tlnp | grep 3000` o `lsof -i :3000`

### User was denied access on the database `humanlink`

El usuario MySQL existe pero **no tiene permisos** sobre la base (común en XAMPP si `setup_mysql.sql` no se aplicó por completo o la tabla `mysql.db` está dañada).

**Solución rápida (XAMPP, como root sin contraseña):**

```powershell
Get-Content database\fix_grants.sql | C:\xampp\mysql\bin\mysql.exe -u root
```

**Linux / macOS / Git Bash:**

```bash
mysql -u root -p < database/fix_grants.sql
```

Verifique:

```bash
mysql -u humanlink -phumanlink2026 -e "SELECT 1;" humanlink
```

**Si `GRANT` falla con error Aria / checksum (XAMPP):**

```powershell
C:\xampp\mysql\bin\mysqlcheck.exe -u root --repair mysql
Get-Content database\fix_grants.sql | C:\xampp\mysql\bin\mysql.exe -u root
```

Reinicie el servidor: detenga `npm run dev` (Ctrl+C) y vuelva a ejecutarlo.

**Alternativa temporal (solo desarrollo local):** use root en `.env` si XAMPP no tiene contraseña root:

```
DATABASE_URL="mysql://root@localhost:3306/humanlink"
```

### ERROR 1045 — Access denied for user `humanlink`

El usuario no existe o la contraseña no coincide con `.env`.

**XAMPP (PowerShell):**

```powershell
Get-Content database\fix_grants.sql | C:\xampp\mysql\bin\mysql.exe -u root
mysql -u humanlink -phumanlink2026 -e "SELECT 1;" humanlink
```

Si sigue fallando, reinicio completo de la BD:

```powershell
Get-Content database\reset_database.sql | C:\xampp\mysql\bin\mysql.exe -u root
npm run db:setup
```

### Error Prisma: tablespace for `_prisma_migrations` exists

Archivos huérfanos en XAMPP tras borrar tablas manualmente. Use `database/reset_database.sql` + `npm run db:setup` (comandos arriba).

### Error de conexión con MySQL / MariaDB

1. Verifique que el servicio esté activo.
2. Confirme `DATABASE_URL` en `.env` (usuario, contraseña, host, puerto, nombre de BD).
3. Pruebe conexión manual: `mysql -u humanlink -p humanlink`
4. Si la BD no existe, ejecute `database/setup_mysql.sql` como root.
5. En MariaDB use el mismo formato `mysql://...` en `DATABASE_URL`.

### Prisma Client no generado

```bash
npm run db:generate
```

O reinstale: `npm install` (ejecuta `postinstall` → `prisma generate`).

### Variables de entorno faltantes

- Copie `.env.example` → `.env`.
- Mínimo requerido: `DATABASE_URL` y `JWT_SECRET`.
- Reinicie `npm run dev` tras editar `.env`.

### Error al ejecutar migraciones

| Error típico | Solución |
|--------------|----------|
| `P1001` Can't reach database | MySQL no corre o `DATABASE_URL` incorrecta |
| `P1003` Database does not exist | Ejecutar `database/setup_mysql.sql` |
| `P3009` migrate failed | BD vacía: `npm run db:migrate`. Si hay conflicto, consulte con el equipo antes de resetear datos |

### Error al ejecutar el seed

1. Ejecute migraciones primero: `npm run db:migrate`
2. Si el seed falla por duplicados, la BD ya tiene datos; use una BD limpia o elimine tablas solo en entorno de desarrollo.
3. Verifique logs en consola; el seed tarda unos segundos.

### Error de permisos (MySQL)

El usuario en `DATABASE_URL` debe tener `ALL PRIVILEGES` sobre `humanlink`. Vuelva a ejecutar `database/setup_mysql.sql` como root o:

```sql
GRANT ALL PRIVILEGES ON humanlink.* TO 'humanlink'@'localhost';
FLUSH PRIVILEGES;
```

### `mysql` no reconocido como comando

Agregue MySQL/MariaDB al **PATH** del sistema o use la ruta completa al binario (ej. `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`).

### PowerShell no acepta `<` para redirección

Use: `Get-Content database\setup_mysql.sql | mysql -u root -p`

### Errores al compilar (`npm run build`)

```bash
npm run db:generate
npm run build
```

---

## Estructura del proyecto

```
HumanLink/
├── database/              # Scripts SQL académicos (MySQL 8)
├── prisma/
│   ├── schema.prisma      # Modelo de datos
│   ├── seed.ts            # Datos demo
│   └── migrations/        # Migraciones Prisma (MySQL)
├── src/app/(dashboard)/   # UI por módulo
├── src/app/api/           # APIs REST
├── src/lib/               # auth, vacaciones, email, auditoría…
├── tests/                 # Tests unitarios
└── uploads/               # Archivos subidos (gitignored)
```

---

## Módulos del sistema

### Inicio
Dashboard por rol · Mi Perfil · Notificaciones

### Organización
Organizaciones · Departamentos · Turnos · Organigrama · Permisos por rol

### Personal
Empleados · Asistencias · Permisos/Vacaciones · Onboarding/Offboarding · Home office · Activos · Incapacidades

### Reclutamiento
Vacantes · Candidatos (contratación crea empleado + usuario)

### Desarrollo
Capacitaciones · Evaluaciones · OKRs · Eventos · Encuestas · Plan de carrera

### Comunicación
Comunicados · Quejas · Tickets · Firmas digitales

### Administración
Documentos · Reportes · Auditoría · API docs

---

## Características técnicas

- **Auth:** JWT en cookie httpOnly, sesiones en BD, 2FA TOTP (RFC 6238)
- **Notificaciones:** In-app + email (nodemailer) o `EmailLog` en modo demo
- **Reportes:** CSV y Excel (.xlsx)
- **Archivos:** Subida local en `uploads/`
- **APIs:** 70+ rutas REST bajo `/api/`

---

## Equipo

Ochoa Calte Guillermo Zaid · Gutiérrez Rivas Ernesto · De Jesús Martínez Adad Ramses · Olaiz Ventura Carol Anne Selene
