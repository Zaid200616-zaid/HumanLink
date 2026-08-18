# HumanLink — Backend Django (demo BD académica)

Complemento académico para **triggers, procedimientos almacenados y vistas** sobre la misma base MySQL que la app principal.

> **App completa (UI original):** use Next.js en la raíz → `npm run dev` → http://localhost:3000  
> Este backend Django en :8000 replica módulos básicos; el panel académico está en `/database-demo/`.

## Requisitos

- Python 3.11+
- MySQL 8+ en ejecución
- Base `humanlink` migrada y con seed (`npm run db:setup` desde la raíz del repo)

## Instalación

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copie `.env` en la raíz del proyecto (o configure variables en `backend/.env`):

```
DATABASE_URL=mysql://humanlink:humanlink2026@localhost:3306/humanlink
DJANGO_SECRET_KEY=cambiar-en-produccion
DJANGO_DEBUG=true
```

## Artefactos académicos MySQL (opcional pero recomendado)

```powershell
mysql -u humanlink -p humanlink < ..\database\triggers_mysql.sql
mysql -u humanlink -p humanlink < ..\database\procedures_mysql.sql
mysql -u humanlink -p humanlink < ..\database\views_mysql.sql
```

## Ejecutar

```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```

Abrir: **http://localhost:8000** (login básico) · **http://localhost:8000/database-demo/** (panel BD)

Contraseña demo: **HumanLink2026!**

Si una cuenta demo quedó bloqueada por intentos fallidos:

```powershell
python manage.py desbloquear_demo
```

## Arquitectura

```
Usuario → Django (templates + vistas) → MySQL humanlink
                                      → Triggers / SP / Vistas (database/*.sql)
```

| Ruta | Descripción |
|------|-------------|
| `/login/` | Autenticación (tabla Usuario, bcrypt) |
| `/dashboard/` | Inicio con KPIs por rol |
| `/empleados/`, `/solicitudes/`, … | Módulos RF-H01–H20 |
| `/database-demo/` | Demostración BD avanzadas (Admin/RH) |
| `/postular/` | Formulario público de candidatos |

## Modelos

Todos los modelos en `core/models.py` tienen `managed=False` — Django **no** modifica el esquema Prisma existente.

## Next.js (legacy)

La carpeta `src/` conserva la implementación Next.js anterior. Para producción académica use Django en el puerto 8000.
