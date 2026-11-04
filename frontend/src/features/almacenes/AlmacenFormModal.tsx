import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { applyServerErrors } from "@/lib/errors";
import { almacenSchema, type AlmacenForm } from "@/lib/schemas";
import type { Almacen } from "@/types/domain";

export function AlmacenFormModal({
  open,
  onClose,
  almacen,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  almacen: Almacen | null;
  onSubmit: (values: AlmacenForm) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AlmacenForm>({
    resolver: zodResolver(almacenSchema),
    defaultValues: {
      codigo: "",
      codigo_establecimiento: "0000",
      codigo_correlativo: "",
      nombre: "",
      direccion: "",
      ubigeo: "",
      es_almacen_tercero: false,
      activo: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      almacen
        ? {
            codigo: almacen.codigo,
            codigo_establecimiento: almacen.codigo_establecimiento,
            codigo_correlativo: almacen.codigo_correlativo ?? "",
            nombre: almacen.nombre,
            direccion: almacen.direccion,
            ubigeo: almacen.ubigeo,
            es_almacen_tercero: almacen.es_almacen_tercero,
            activo: almacen.activo,
          }
        : {
            codigo: "",
            codigo_establecimiento: "0000",
            codigo_correlativo: "",
            nombre: "",
            direccion: "",
            ubigeo: "",
            es_almacen_tercero: false,
            activo: true,
          },
    );
  }, [open, almacen, reset]);

  async function submit(values: AlmacenForm) {
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
      title={almacen ? "Editar almacén" : "Nuevo almacén"}
      description="Configura el establecimiento anexo y los datos del almacén."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {almacen ? "Guardar cambios" : "Crear almacén"}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código interno" htmlFor="codigo" error={errors.codigo?.message} required>
            <Input id="codigo" placeholder="ALM-001" {...register("codigo")} />
          </Field>
          <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message} required>
            <Input id="nombre" placeholder="Almacén central" {...register("nombre")} />
          </Field>
          <Field
            label="Establecimiento SUNAT"
            htmlFor="codigo_establecimiento"
            hint="4 dígitos del establecimiento anexo."
            error={errors.codigo_establecimiento?.message}
            required
          >
            <Input
              id="codigo_establecimiento"
              inputMode="numeric"
              maxLength={4}
              {...register("codigo_establecimiento")}
            />
          </Field>
          <Field
            label="Correlativo"
            htmlFor="codigo_correlativo"
            hint="Opcional, 3 dígitos si comparte establecimiento."
            error={errors.codigo_correlativo?.message}
          >
            <Input
              id="codigo_correlativo"
              inputMode="numeric"
              maxLength={3}
              placeholder="001"
              {...register("codigo_correlativo")}
            />
          </Field>
        </div>

        <Field label="Dirección" htmlFor="direccion" error={errors.direccion?.message} required>
          <Input
            id="direccion"
            placeholder="Av. Los Almacenes 123, Lima"
            {...register("direccion")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ubigeo" htmlFor="ubigeo" error={errors.ubigeo?.message}>
            <Input id="ubigeo" inputMode="numeric" maxLength={6} placeholder="150101" {...register("ubigeo")} />
          </Field>
          <div className="flex items-center gap-6 pt-6">
            <Checkbox label="Almacén de tercero" {...register("es_almacen_tercero")} />
            <Checkbox label="Activo" {...register("activo")} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
