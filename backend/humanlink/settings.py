import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "humanlink-django-dev-secret-change-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in ("1", "true", "yes")
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
    "database_demo",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.HumanLinkSessionMiddleware",
]

ROOT_URLCONF = "humanlink.urls"
WSGI_APPLICATION = "humanlink.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.messages.context_processors.messages",
                "core.context_processors.humanlink_nav",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("MYSQL_DATABASE", "humanlink"),
        "USER": os.environ.get("MYSQL_USER", "humanlink"),
        "PASSWORD": os.environ.get("MYSQL_PASSWORD", "humanlink2026"),
        "HOST": os.environ.get("MYSQL_HOST", "localhost"),
        "PORT": os.environ.get("MYSQL_PORT", "3306"),
        "OPTIONS": {"charset": "utf8mb4"},
    }
}

_db_url = os.environ.get("DATABASE_URL", "")
if _db_url.startswith("mysql://"):
    from urllib.parse import urlparse

    parsed = urlparse(_db_url)
    DATABASES["default"].update(
        {
            "USER": parsed.username or DATABASES["default"]["USER"],
            "PASSWORD": parsed.password or DATABASES["default"]["PASSWORD"],
            "HOST": parsed.hostname or DATABASES["default"]["HOST"],
            "PORT": str(parsed.port or DATABASES["default"]["PORT"]),
            "NAME": (parsed.path or "/humanlink").lstrip("/") or "humanlink",
        }
    )

# XAMPP suele traer MariaDB 10.4; Django 5.2+ exige 10.5+. Esquema vía Prisma (managed=False).
import operator

from django.db.backends.mysql.base import DatabaseWrapper
from django.db.backends.mysql.features import DatabaseFeatures
from django.utils.functional import cached_property

if not getattr(DatabaseWrapper, "_humanlink_version_check_patched", False):
    DatabaseWrapper.check_database_version_supported = lambda self: None
    DatabaseWrapper._humanlink_version_check_patched = True


class HumanLinkDatabaseFeatures(DatabaseFeatures):
    """MariaDB 10.4 (XAMPP) no soporta INSERT … RETURNING."""

    @cached_property
    def can_return_columns_from_insert(self):
        if self.connection.mysql_is_mariadb and self.connection.mysql_version < (10, 5, 0):
            return False
        return self.connection.mysql_is_mariadb

    can_return_rows_from_bulk_insert = property(
        operator.attrgetter("can_return_columns_from_insert")
    )


if not getattr(DatabaseWrapper, "_humanlink_returning_patched", False):
    DatabaseWrapper.features_class = HumanLinkDatabaseFeatures
    DatabaseWrapper._humanlink_returning_patched = True

# Sesiones en cookie firmada — no crea tablas django_* en MySQL existente
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
MIGRATION_MODULES = {
    "contenttypes": None,
    "sessions": None,
}

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Tijuana"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "/media/"
MEDIA_ROOT = ROOT_DIR / "public" / "uploads"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SESSION_COOKIE_NAME = "humanlink_django_session"
SESSION_COOKIE_AGE = 60 * 60 * 8
LOGIN_URL = "/login/"

HUMANLINK_DEMO_PASSWORD = os.environ.get("HUMANLINK_DEMO_PASSWORD", "HumanLink2026!")
