from django.core.management.base import BaseCommand

from core.models import Usuario
from core.nav import DEMO_USERS


class Command(BaseCommand):
    help = "Restablece intentos fallidos y bloqueo temporal en cuentas demo."

    def handle(self, *args, **options):
        emails = [u["email"] for u in DEMO_USERS]
        updated = Usuario.objects.filter(email__in=emails).update(
            intentosFallidos=0, bloqueadoHasta=None
        )
        self.stdout.write(self.style.SUCCESS(f"Cuentas demo desbloqueadas: {updated}"))
