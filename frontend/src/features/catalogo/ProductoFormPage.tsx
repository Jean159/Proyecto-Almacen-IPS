import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { catalogoApi, type ProductoPayload } from "@/api/catalogo";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSunatTabla } from "@/hooks/useSunatTabla";
import { applyServerErrors, errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { productoSchema, type ProductoForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";

const fallback = {
  tipos: [
    ["01", "Mercaderías"],
    ["02", "Productos terminados"],
    ["03", "Materias primas"],
    ["04", "Envases"],
    ["05", "Materiales auxiliares"],
    ["06", "Suministros"],
  ],
  unidades: [
    ["NIU", "Unidad (bienes)"],
    ["KGM", "Kilogramo"],
    ["LTR", "Litro"],
    ["BX", "Caja"],
    ["ZZ", "Unidad (servicios)"],
  ],
  catalogos: [
    ["1", "Naciones Unidas (UNSPSC)"],
    ["3", "GS1 (GTIN)"],
    ["9", "Otros (código propio)"],
  ],
  metodos: [
    ["1", "Promedio ponderado"],
    ["2", "Primeras entradas, primeras salidas (FIFO)"],
    ["5", "Identificación específica"],
  ],
};

export function ProductoFormPage() {
  const { id } = useParams<{ id: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [atributosTexto, setAtributosTexto] = useState("{}");
  const [atributosError, setAtributosError] = useState<string | null>(null);

  const productoQuery = useQuery({
    queryKey: queryKeys.producto(id),
    queryFn: () => catalogoApi.producto(id!),
    enabled: Boolean(id),
  });
  const categoriasQuery = useQuery({
    queryKey: queryKeys.categorias(empresa?.id, { page_size: 200 }),
    queryFn: () => catalogoApi.categorias({ page_size: 200 }),
    enabled: Boolean(empresa),
  });
  const tipos = useSunatTabla(5);
  const unidades = useSunatTabla(6);
  const catalogos = useSunatTabla(13);
  const metodos = useSunatTabla(14);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProductoForm>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      sku: "",
      codigo_barras: "",
      descripcion: "",
      categoria: "",
      tipo_existencia: "01",
      unidad_medida: "NIU",
      catalogo_tipo: "9",
      codigo_propio_sunat: "",
      catalogo_internacional: "",
      codigo_internacional: "",
      cubso_osce: "",
      metodo_valuacion: "1",
      control_lotes: false,
      control_series: false,
      stock_minimo: "0",
      stock_maximo: "0",
      punto_reorden: "0",
      activo: true,
    },
  });

  const catalogoInternacional = watch("catalogo_internacional");
  const metodo = watch("metodo_valuacion");

  useEffect(() => {
    if (productoQuery.data) {
      const producto = productoQuery.data;
      reset({
        sku: producto.sku,
        codigo_barras: producto.codigo_barras,
        descripcion: producto.descripcion,
        categoria: producto.categoria ?? "",
        tipo_existencia: producto.tipo_existencia,
        unidad_medida: producto.unidad_medida,
        catalogo_tipo: producto.catalogo_tipo,
        codigo_propio_sunat: producto.codigo_propio_sunat,
        catalogo_internacional: producto.catalogo_internacional ?? "",
        codigo_internacional: producto.codigo_internacional,
        cubso_osce: producto.cubso_osce,
        metodo_valuacion: producto.metodo_valuacion,
        control_lotes: producto.control_lotes,
        control_series: producto.control_series,
        stock_minimo: producto.stock_minimo,
        stock_maximo: producto.stock_maximo,
        punto_reorden: producto.punto_reorden,
        activo: producto.activo,
      });
      setAtributosTexto(JSON.stringify(producto.atributos_extra ?? {}, null, 2));
    }
  }, [productoQuery.data, reset]);

  const guardar = useMutation({
    mutationFn: (payload: ProductoPayload) =>
      esEdicion && id
        ? catalogoApi.actualizarProducto(id, payload)
        : catalogoApi.crearProducto(payload),
    onSuccess: () => {
      toast.success(esEdicion ? "Producto actualizado" : "Producto creado");
      queryClient.invalidateQueries({ queryKey: ["productos", empresa?.id] });
      navigate("/catalogo/productos");
    },
  });

  async function submit(values: ProductoForm) {
    let atributos: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(atributosTexto || "{}");
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        throw new Error("Debe ser un objeto JSON.");
      }
      atributos = parsed as Record<string, unknown>;
      setAtributosError(null);
    } catch {
      setAtributosError("Ingresa un objeto JSON válido, por ejemplo: {\"color\":\"rojo\"}.");
      return;
    }
    const payload: ProductoPayload = {
      ...values,
      categoria: values.categoria || null,
      atributos_extra: atributos,
    };
    try {
      await guardar.mutateAsync(payload);
    } catch (error) {
      applyServerErrors(error, setError);
      toast.error(errorMessage(error));
    }
  }

  if (esEdicion && productoQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (esEdicion && productoQuery.error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-rose-600">
          {errorMessage(productoQuery.error)}
        </CardContent>
      </Card>
    );
  }

  const tiposOptions = tipos.data?.map((item) => [item.codigo, item.descripcion]) ?? fallback.tipos;
  const unidadesOptions =
    unidades.data?.map((item) => [item.codigo, item.descripcion]) ?? fallback.unidades;
  const catalogosOptions =
    catalogos.data?.map((item) => [item.codigo, item.descripcion]) ?? fallback.catalogos;
  const metodosOptions = (
    metodos.data?.map((item) => [item.codigo, item.descripcion]) ?? fallback.metodos
  ).filter(([codigo]) => ["1", "2", "5"].includes(String(codigo)));

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title={esEdicion ? "Editar producto" : "Nuevo producto"}
        description="La ficha SUNAT y el método de valuación son la base del kardex."
        actions={
          <>
            <Link to="/catalogo/productos">
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver
              </Button>
            </Link>
            <Button
              leftIcon={<Save className="h-4 w-4" />}
              loading={guardar.isPending}
              onClick={handleSubmit(submit)}
            >
              Guardar producto
            </Button>
          </>
        }
      />

      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
            <CardDescription>Datos comerciales y clasificación interna.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="sku" error={errors.sku?.message} required>
              <Input id="sku" placeholder="SKU-001" {...register("sku")} />
            </Field>
            <Field label="Código de barras" htmlFor="codigo_barras" error={errors.codigo_barras?.message}>
              <Input id="codigo_barras" placeholder="7751234567890" {...register("codigo_barras")} />
            </Field>
            <Field
              label="Descripción"
              htmlFor="descripcion"
              error={errors.descripcion?.message}
              required
              className="sm:col-span-2"
            >
              <Input id="descripcion" placeholder="Nombre del producto" {...register("descripcion")} />
            </Field>
            <Field label="Categoría" htmlFor="categoria" error={errors.categoria?.message}>
              <Select id="categoria" {...register("categoria")}>
                <option value="">Sin categoría</option>
                {categoriasQuery.data?.results.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado" htmlFor="activo">
              <div className="pt-2">
                <Checkbox label="Producto activo" {...register("activo")} />
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ficha SUNAT</CardTitle>
            <CardDescription>
              Se congela en el kardex al confirmar cada movimiento.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Tipo de existencia" htmlFor="tipo_existencia" required>
              <Select id="tipo_existencia" {...register("tipo_existencia")}>
                {tiposOptions.map(([codigo, descripcion]) => (
                  <option key={codigo} value={codigo}>
                    {codigo} · {descripcion}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unidad de medida" htmlFor="unidad_medida" required>
              <Select id="unidad_medida" {...register("unidad_medida")}>
                {unidadesOptions.map(([codigo, descripcion]) => (
                  <option key={codigo} value={codigo}>
                    {codigo} · {descripcion}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Catálogo" htmlFor="catalogo_tipo" required>
              <Select id="catalogo_tipo" {...register("catalogo_tipo")}>
                {catalogosOptions.map(([codigo, descripcion]) => (
                  <option key={codigo} value={codigo}>
                    {codigo} · {descripcion}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Código propio SUNAT" htmlFor="codigo_propio_sunat" required error={errors.codigo_propio_sunat?.message}>
              <Input id="codigo_propio_sunat" placeholder="PROD-001" {...register("codigo_propio_sunat")} />
            </Field>
            <Field label="Catálogo internacional" htmlFor="catalogo_internacional">
              <Select id="catalogo_internacional" {...register("catalogo_internacional")}>
                <option value="">Sin código internacional</option>
                <option value="1">1 · UNSPSC</option>
                <option value="3">3 · GTIN</option>
              </Select>
            </Field>
            <Field label="Código internacional" htmlFor="codigo_internacional" error={errors.codigo_internacional?.message}>
              <Input
                id="codigo_internacional"
                placeholder="Código UNSPSC o GTIN"
                disabled={!catalogoInternacional}
                {...register("codigo_internacional")}
              />
            </Field>
            <Field label="CUBSO OSCE" htmlFor="cubso_osce" hint="Opcional; no forma parte del PLE 12.1/13.1.">
              <Input id="cubso_osce" placeholder="0000000000000000" maxLength={16} {...register("cubso_osce")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valuación y controles</CardTitle>
            <CardDescription>
              El método no debería cambiarse si el producto ya tiene kardex.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Método de valuación" htmlFor="metodo_valuacion" required>
                <Select id="metodo_valuacion" {...register("metodo_valuacion")}>
                  {metodosOptions.map(([codigo, descripcion]) => (
                    <option key={codigo} value={codigo}>
                      {codigo} · {descripcion}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <Checkbox label="Controla lotes" {...register("control_lotes")} />
                <Checkbox label="Controla series" {...register("control_series")} />
              </div>
            </div>
            {metodo === "5" && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                La identificación específica está en el catálogo, pero el motor v1 la
                rechazará al confirmar movimientos.
              </div>
            )}
            {errors.control_series?.message && (
              <p className="text-xs text-rose-600">{errors.control_series.message}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Stock mínimo" htmlFor="stock_minimo">
                <Input id="stock_minimo" type="number" step="0.0001" min="0" {...register("stock_minimo")} />
              </Field>
              <Field label="Stock máximo" htmlFor="stock_maximo">
                <Input id="stock_maximo" type="number" step="0.0001" min="0" {...register("stock_maximo")} />
              </Field>
              <Field label="Punto de reorden" htmlFor="punto_reorden">
                <Input id="punto_reorden" type="number" step="0.0001" min="0" {...register("punto_reorden")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atributos extra</CardTitle>
            <CardDescription>
              JSONB para datos de giro: principio activo, talla, color, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="JSON" htmlFor="atributos_extra" error={atributosError ?? undefined}>
              <Textarea
                id="atributos_extra"
                className="min-h-32 font-mono text-xs"
                value={atributosTexto}
                onChange={(event) => setAtributosTexto(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/catalogo/productos">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" leftIcon={<Save className="h-4 w-4" />} loading={guardar.isPending}>
            Guardar producto
          </Button>
        </div>
      </form>
    </div>
  );
}
