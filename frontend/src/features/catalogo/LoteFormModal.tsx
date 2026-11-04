import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { applyServerErrors } from "@/lib/errors";
import { loteSchema, type LoteForm } from "@/lib/schemas";
import type { LoteSerie, Producto } from "@/types/domain";

export function LoteFormModal({
  open,
  onClose,
  lote,
  productos,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  lote: LoteSerie | null;
  productos: Producto[];
  onSubmit: (values: LoteForm) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoteForm>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      producto: "",
      numero_lote_serie: "",
      fecha_fabricacion: "",
      fecha_vencimiento: "",
      estado: "DISPONIBLE",
      activo: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      lote
        ? {
            producto: lote.producto,
            numero_lote_serie: lote.numero_lote_serie,
            fecha_fabricacion: lote.fecha_fabricacion ?? "",
            fecha_vencimiento: lote.fecha_vencimiento ?? "",
            estado: lote.estado,
            activo: lote.activo,
          }
        : {
            producto: "",
            numero_lote_serie: "",
            fecha_fabricacion: "",
            fecha_vencimiento: "",
            estado: "DISPONIBLE",
            activo: true,
          },
    );
  }, [open, lote, reset]);

  async function submit(values: LoteForm) {
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
      title={lote ? "Editar lote o serie" : "Nuevo lote o serie"}
      description="Registra el identificador y, si aplica, la fecha de vencimiento."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {lote ? "Guardar cambios" : "Crear lote"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <Field label="Producto" htmlFor="producto" error={errors.producto?.message} required>
          <Select id="producto" {...register("producto")}>
            <option value="">Seleccionar…</option>
            {productos.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.sku} · {producto.descripcion}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Número de lote o serie"
          htmlFor="numero_lote_serie"
          error={errors.numero_lote_serie?.message}
          required
        >
          <Input id="numero_lote_serie" placeholder="LOTE-2026-001" {...register("numero_lote_serie")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de fabricación" htmlFor="fecha_fabricacion">
            <Input id="fecha_fabricacion" type="date" {...register("fecha_fabricacion")} />
          </Field>
          <Field label="Fecha de vencimiento" htmlFor="fecha_vencimiento">
            <Input id="fecha_vencimiento" type="date" {...register("fecha_vencimiento")} />
          </Field>
        </div>
        <Field label="Estado" htmlFor="estado">
          <Select id="estado" {...register("estado")}>
            <option value="DISPONIBLE">Disponible</option>
            <option value="CUARENTENA">En cuarentena</option>
            <option value="VENCIDO">Vencido</option>
          </Select>
        </Field>
        <Checkbox label="Lote activo" {...register("activo")} />
      </form>
    </Modal>
  );
}
