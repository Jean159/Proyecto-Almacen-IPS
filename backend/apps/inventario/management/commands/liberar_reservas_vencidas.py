from django.core.management.base import BaseCommand

from apps.inventario.services import ReservaService


class Command(BaseCommand):
    help = "Libera reservas de stock cuya fecha de expiración ya pasó."

    def handle(self, *args, **options):
        total = ReservaService.liberar_vencidas()
        self.stdout.write(self.style.SUCCESS(f"Reservas vencidas liberadas: {total}."))
