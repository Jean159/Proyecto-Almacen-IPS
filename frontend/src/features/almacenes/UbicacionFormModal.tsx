import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { applyServerErrors } from "@/lib/errors";
import { ubicacionSchema, type UbicacionForm } from "@/lib/schemas";
import type { Almacen, Ubicacion } from "@/types/domain";

export function UbicacionFormModal({
  open,
  onClose,
  ubicacion,
  almacenes,
  almacenFijo,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  ubicacion: Ubicacion | null;
  almacenes: Almacen[];
  almacenFijo?: string;
  onSubmit: (values: UbicacionForm) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UbicacionForm>({
    resolver: zodResolver(ubicacionSchema),
    defaultValues: {
      almacen: almacenFijo ?? "",
      codigo: "",
      descripcion: "",
      capacidad_peso_kg: "",
      capacidad_volumen_m3: "",
      activo: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      ubicacion
        ? {
            almacen: ubicacion.almacen,
            codigo: ubicacion.codigo,
            descripcion: ubicacion.descripcion,
            capacidad_peso_kg: ubicacion.capacidad_peso_kg ?? "",
            capacidad_volumen_m3: ubicacion.capacidad_volumen_m3 ?? "",
            activo: ubicacion.activo,
          }
        : {
            almacen: almacenFijo ?? "",
            codigo: "",
            descripcion: "",
            capacidad_peso_kg: "",
            capacidad_volumen_m3: "",
            activo: true,
          },
    );
  }, [open, ubicacion, almacenFijo, reset]);

  async function submit(values: UbicacionForm) {
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
      title={ubicacion ? "Editar ubicación" : "Nueva ubicación"}
      description="Define el código físico dentro del almacén."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {ubicacion ? "Guardar cambios" : "Crear ubicación"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <Field label="Almacén" htmlFor="almacen" error={errors.almacen?.message} required>
          <Select id="almacen" {...register("almacen")} disabled={Boolean(almacenFijo)}>
            <option value="">Seleccionar…</option>
            {almacenes.map((almacen) => (
              <option key={almacen.id} value={almacen.id}>
                {almacen.codigo} · {almacen.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Código" htmlFor="codigo" error={errors.codigo?.message} required>
          <Input id="codigo" placeholder="PAS-01-RACK-02-NIV-03" {...register("codigo")} />
        </Field>
        <Field label="Descripción" htmlFor="descripcion" error={errors.descripcion?.message}>
          <Input id="descripcion" placeholder="Pasillo 1, rack 2, nivel 3" {...register("descripcion")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Capacidad peso (kg)" htmlFor="capacidad_peso_kg">
            <Input id="capacidad_peso_kg" type="number" step="0.01" min="0" {...register("capacidad_peso_kg")} />
          </Field>
          <Field label="Capacidad volumen (m³)" htmlFor="capacidad_volumen_m3">
            <Input id="capacidad_volumen_m3" type="number" step="0.01" min="0" {...register("capacidad_volumen_m3")} />
          </Field>
        </div>
        <Checkbox label="Ubicación activa" {...register("activo")} />
      </form>
    </Modal>
  );
}
