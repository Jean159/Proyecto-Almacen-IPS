import uuid

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError

from apps.core.models import Empresa, UsuarioEmpresa


def _filtro_empresa(raw: str):
    filtro = Q(ruc=raw)
    try:
        filtro |= Q(id=uuid.UUID(str(raw)))
    except (TypeError, ValueError):
        pass
    return filtro


def obtener_empresa(request, requerida: bool = True):
    """Resuelve la empresa desde X-Empresa-ID o desde la única membresía del usuario."""
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        raise NotAuthenticated("Debe iniciar sesión.")

    raw = request.headers.get("X-Empresa-ID") or request.query_params.get("empresa")
    if user.is_superuser:
        qs = Empresa.objects.filter(activo=True)
        if raw:
            empresa = qs.filter(_filtro_empresa(raw)).first()
            if not empresa:
                raise ValidationError("La empresa indicada no existe o está inactiva.")
        else:
            empresa = qs.order_by("creado_en").first()
            if not empresa and requerida:
                raise ValidationError("No hay empresas activas registradas.")
    else:
        membresias = (
            UsuarioEmpresa.objects.filter(usuario=user, activo=True, empresa__activo=True)
            .select_related("empresa")
            .order_by("empresa__creado_en")
        )
        if raw:
            filtro = Q(empresa__ruc=raw)
            try:
                filtro |= Q(empresa_id=uuid.UUID(str(raw)))
            except (TypeError, ValueError):
                pass
            membresia = membresias.filter(filtro).first()
            if not membresia:
                raise PermissionDenied("El usuario no pertenece a la empresa indicada.")
            empresa = membresia.empresa
        else:
            lista = list(membresias[:2])
            if len(lista) == 1:
                empresa = lista[0].empresa
            elif not lista:
                if requerida:
                    raise PermissionDenied("El usuario no tiene empresas activas.")
                empresa = None
            else:
                raise ValidationError("Debe indicar la empresa en el header X-Empresa-ID.")

    request.empresa = empresa
    return empresa


def obtener_rol(request, empresa=None) -> str | None:
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return "ADMIN"
    empresa = empresa or getattr(request, "empresa", None)
    if not empresa:
        try:
            empresa = obtener_empresa(request)
        except (PermissionDenied, ValidationError, NotAuthenticated):
            return None
    membresia = (
        UsuarioEmpresa.objects.filter(usuario=user, empresa=empresa, activo=True)
        .only("rol")
        .first()
    )
    return membresia.rol if membresia else None


def empresa_del_usuario(user):
    if user.is_superuser:
        return Empresa.objects.filter(activo=True)
    return Empresa.objects.filter(usuarios__usuario=user, usuarios__activo=True, activo=True)


def validar_pertenencia_empresa(empresa, *objetos) -> None:
    """Comprueba que los objetos con empresa/almacén pertenezcan al tenant."""
    for obj in objetos:
        if obj is None:
            continue
        obj_empresa = getattr(obj, "empresa", None)
        if obj_empresa is None and hasattr(obj, "almacen"):
            obj_empresa = getattr(obj.almacen, "empresa", None)
        if obj_empresa is not None and obj_empresa.pk != empresa.pk:
            raise ValidationError("Un objeto pertenece a otra empresa.")


def obtener_o_error(modelo, **filtros):
    try:
        return modelo.objects.get(**filtros)
    except ObjectDoesNotExist as exc:
        raise ValidationError("El objeto indicado no existe.") from exc
