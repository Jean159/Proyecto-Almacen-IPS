import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { applyServerErrors } from "@/lib/errors";
import { categoriaSchema, type CategoriaForm } from "@/lib/schemas";
import type { CategoriaProducto } from "@/types/domain";

export function CategoriaFormModal({
  open,
  onClose,
  categoria,
  categorias,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  categoria: CategoriaProducto | null;
  categorias: CategoriaProducto[];
  onSubmit: (values: CategoriaForm) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaForm>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: "",
      parent: "",
      cuenta_contable_inventario: "20111",
      cuenta_contable_costo_venta: "69111",
      activo: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      categoria
        ? {
            nombre: categoria.nombre,
            parent: categoria.parent ?? "",
            cuenta_contable_inventario: categoria.cuenta_contable_inventario,
            cuenta_contable_costo_venta: categoria.cuenta_contable_costo_venta,
            activo: categoria.activo,
          }
        : {
            nombre: "",
            parent: "",
            cuenta_contable_inventario: "20111",
            cuenta_contable_costo_venta: "69111",
            activo: true,
          },
    );
  }, [open, categoria, reset]);

  async function submit(values: CategoriaForm) {
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
      title={categoria ? "Editar categoría" : "Nueva categoría"}
      description="Las cuentas PCGE se usan como referencia contable."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {categoria ? "Guardar cambios" : "Crear categoría"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message} required>
          <Input id="nombre" placeholder="Abarrotes" {...register("nombre")} />
        </Field>
        <Field label="Categoría padre" htmlFor="parent">
          <Select id="parent" {...register("parent")}>
            <option value="">Sin categoría padre</option>
            {categorias
              .filter((item) => item.id !== categoria?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cuenta inventario" htmlFor="cuenta_contable_inventario">
            <Input id="cuenta_contable_inventario" {...register("cuenta_contable_inventario")} />
          </Field>
          <Field label="Cuenta costo de venta" htmlFor="cuenta_contable_costo_venta">
            <Input id="cuenta_contable_costo_venta" {...register("cuenta_contable_costo_venta")} />
          </Field>
        </div>
        <Checkbox label="Categoría activa" {...register("activo")} />
      </form>
    </Modal>
  );
}
