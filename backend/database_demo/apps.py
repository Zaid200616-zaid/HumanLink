from django.apps import AppConfig


class DatabaseDemoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "database_demo"
    verbose_name = "Demostración de base de datos"
