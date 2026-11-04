import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { ubicacionesApi } from "@/api/almacenes";
import { catalogoApi } from "@/api/catalogo";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { applyServerErrors } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { reservaSchema, type ReservaForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { Almacen, Producto } from "@/types/domain";

export function ReservaFormModal({
  open,
  onClose,
  almacenes,
  productos,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  almacenes: Almacen[];
  productos: Producto[];
  onSubmit: (values: ReservaForm) => Promise<void>;
}) {
  const empresa = useEmpresaStore((state) => state.empresa);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservaForm>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      almacen: "",
      producto: "",
      ubicacion: "",
      lote_serie: "",
      cantidad: "",
      expira_en: "",
      referencia: "",
    },
  });

  const almacen = watch("almacen");
  const producto = watch("producto");

  const ubicacionesQuery = useQuery({
    queryKey: queryKeys.ubicaciones(empresa?.id, { almacen, page_size: 200 }),
    queryFn: () => ubicacionesApi.list({ almacen, page_size: 200 }),
    enabled: Boolean(empresa && almacen && open),
  });
  const lotesQuery = useQuery({
    queryKey: queryKeys.lotes(empresa?.id, { producto, page_size: 100 }),
    queryFn: () => catalogoApi.lotes({ producto, page_size: 100, activo: true }),
    enabled: Boolean(empresa && producto && open),
  });

  useEffect(() => {
    if (open) {
      reset({
        almacen: "",
        producto: "",
        ubicacion: "",
        lote_serie: "",
        cantidad: "",
        expira_en: "",
        referencia: "",
      });
    }
  }, [open, reset]);

  async function submit(values: ReservaForm) {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva reserva de stock"
      description="La cantidad reservada se descuenta de la disponibilidad."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            Crear reserva
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Almacén" htmlFor="almacen" error={errors.almacen?.message} required>
            <Select id="almacen" {...register("almacen")}>
              <option value="">Seleccionar…</option>
              {almacenes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} · {item.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Producto" htmlFor="producto" error={errors.producto?.message} required>
            <Select id="producto" {...register("producto")}>
              <option value="">Seleccionar…</option>
              {productos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} · {item.descripcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ubicación" htmlFor="ubicacion">
            <Select id="ubicacion" {...register("ubicacion")} disabled={!almacen}>
              <option value="">Sin ubicación específica</option>
              {ubicacionesQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} · {item.descripcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lote / serie" htmlFor="lote_serie">
            <Select id="lote_serie" {...register("lote_serie")} disabled={!producto}>
              <option value="">Sin lote específico</option>
              {lotesQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.numero_lote_serie}
                  {item.fecha_vencimiento ? ` · vence ${item.fecha_vencimiento}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cantidad" htmlFor="cantidad" error={errors.cantidad?.message} required>
            <Input id="cantidad" type="number" step="0.0001" min="0.0001" placeholder="0.0000" {...register("cantidad")} />
          </Field>
          <Field label="Expira en" htmlFor="expira_en" hint="Opcional.">
            <Input id="expira_en" type="datetime-local" {...register("expira_en")} />
          </Field>
        </div>
        <Field label="Referencia" htmlFor="referencia" hint="Pedido, cotización o documento externo.">
          <Input id="referencia" placeholder="PEDIDO-2026-001" {...register("referencia")} />
        </Field>
      </form>
    </Modal>
  );
}
