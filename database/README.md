# HumanLink — Bases de Datos Avanzadas (MySQL 8)

Artefactos SQL académicos **independientes de la aplicación Next.js**.  
Prisma sigue gestionando el esquema; estos scripts se aplican **manualmente** sobre la misma base MySQL.

## Requisitos

- MySQL 8.0+
- Base `humanlink` creada (`database/setup_mysql.sql`)
- Migración Prisma aplicada (`npm run db:migrate`)

## Orden de instalación

```bash
mysql -u humanlink -p humanlink < database/triggers_mysql.sql
mysql -u humanlink -p humanlink < database/procedures_mysql.sql
mysql -u humanlink -p humanlink < database/views_mysql.sql
mysql -u humanlink -p humanlink < database/advanced_queries.sql

# Pruebas de demostración (opcional, usa ROLLBACK)
mysql -u humanlink -p humanlink < database/pruebas_demostracion.sql
```

Ver guía completa: `database/demostracion_exposicion.md`

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `setup_mysql.sql` | Crear BD y usuario |
| `triggers_mysql.sql` | 11 triggers documentados (3 obligatorios RF) |
| `procedures_mysql.sql` | 10+ procedimientos almacenados |
| `views_mysql.sql` | 8 vistas administrativas |
| `advanced_queries.sql` | 10+ consultas avanzadas |
| `indexes_mysql.sql` | Inventario de índices del esquema |
| `calculated_fields.md` | Campos calculados y fórmulas |
| `demostracion_exposicion.md` | Guía paso a paso para la exposición |
| `pruebas_demostracion.sql` | Pruebas SQL con ROLLBACK (evidencia triggers) |
| `README.md` | Esta guía |

## Nota importante

Los triggers **no se aplican automáticamente** al iniciar Next.js.  
La aplicación funciona **exactamente igual** hasta que un administrador ejecute los scripts SQL manualmente.
