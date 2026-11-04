from django.core.management.base import BaseCommand

from apps.core.models import SunatTabla
from apps.core.sunat import TABLAS_SEED


class Command(BaseCommand):
    help = "Carga las tablas SUNAT 5, 6, 10, 12, 13 y 14 usadas por el PLE."

    def handle(self, *args, **options):
        creados = 0
        actualizados = 0
        for tabla, items in TABLAS_SEED.items():
            for codigo, descripcion in items:
                _, created = SunatTabla.objects.update_or_create(
                    tabla_numero=tabla,
                    codigo=codigo,
                    defaults={"descripcion": descripcion, "activo": True},
                )
                if created:
                    creados += 1
                else:
                    actualizados += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Tablas SUNAT cargadas: {creados} creadas, {actualizados} actualizadas."
            )
        )
