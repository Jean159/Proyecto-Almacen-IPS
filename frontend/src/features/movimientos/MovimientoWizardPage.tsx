import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { almacenesApi, ubicacionesApi } from "@/api/almacenes";
import { catalogoApi } from "@/api/catalogo";
import { movimientosApi } from "@/api/movimientos";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSunatTabla } from "@/hooks/useSunatTabla";
import { errorMessage } from "@/lib/errors";
import {
  formatMoney,
  formatQuantity,
  toNumber,
  todayIso,
} from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { movimientoSchema, type MovimientoForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";
import type {
  Movimiento,
  MovimientoPayload,
  Producto,
} from "@/types/domain";

const tipoLabels: Record<string, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  TRANSFERENCIA: "Transferencia",
  AJUSTE: "Ajuste",
};

const operacionPorTipo: Record<string, string> = {
  ENTRADA: "02",
  SALIDA: "01",
  TRANSFERENCIA: "11",
  AJUSTE: "28",
};

const comprobantePorTipo: Record<string, string> = {
  ENTRADA: "01",
  SALIDA: "01",
  TRANSFERENCIA: "00",
  AJUSTE: "00",
};

const defaultValues: MovimientoForm = {
  tipo_movimiento: "ENTRADA",
  direccion_ajuste: "",
  tipo_operacion_sunat: "02",
  tipo_comprobante_sunat: "01",
  serie_comprobante: "F001",
  numero_comprobante: "",
  fecha_operacion: todayIso(),
  fecha_documento: "",
  almacen: "",
  almacen_destino: "",
  glosa: "",
  detalles: [
    {
      producto: "",
      ubicacion: "",
      ubicacion_destino: "",
      lote_serie: "",
      cantidad: "",
      costo_unitario: "",
    },
  ],
};

export function MovimientoWizardPage() {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<MovimientoForm>({
    resolver: zodResolver(movimientoSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "detalles" });

  const tipo = watch("tipo_movimiento");
  const almacen = watch("almacen");
  const almacenDestino = watch("almacen_destino");
  const detalles = watch("detalles");
  const fechaOperacion = watch("fecha_operacion");

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });
  const productosQuery = useQuery({
    queryKey: queryKeys.productos(empresa?.id, { page_size: 200, activo: true }),
    queryFn: () => catalogoApi.productos({ page_size: 200, activo: true }),
    enabled: Boolean(empresa),
  });
  const lotesQuery = useQuery({
    queryKey: queryKeys.lotes(empresa?.id, { page_size: 200, activo: true }),
    queryFn: () => catalogoApi.lotes({ page_size: 200, activo: true }),
    enabled: Boolean(empresa),
  });
  const ubicacionesOrigen = useQuery({
    queryKey: queryKeys.ubicaciones(empresa?.id, { almacen, page_size: 200 }),
    queryFn: () => ubicacionesApi.list({ almacen, page_size: 200 }),
    enabled: Boolean(empresa && almacen),
  });
  const ubicacionesDestino = useQuery({
    queryKey: queryKeys.ubicaciones(empresa?.id, {
      almacen: almacenDestino,
      page_size: 200,
    }),
    queryFn: () => ubicacionesApi.list({ almacen: almacenDestino, page_size: 200 }),
    enabled: Boolean(empresa && almacenDestino),
  });
  const operaciones = useSunatTabla(12);
  const comprobantes = useSunatTabla(10);

  const movimientoQuery = useQuery({
    queryKey: queryKeys.movimiento(id),
    queryFn: () => movimientosApi.get(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!movimientoQuery.data) return;
    const movimiento: Movimiento = movimientoQuery.data;
    reset({
      tipo_movimiento: movimiento.tipo_movimiento,
      direccion_ajuste: movimiento.direccion_ajuste || "",
      tipo_operacion_sunat: movimiento.tipo_operacion_sunat,
      tipo_comprobante_sunat: movimiento.tipo_comprobante_sunat,
      serie_comprobante: movimiento.serie_comprobante,
      numero_comprobante: movimiento.numero_comprobante,
      fecha_operacion: movimiento.fecha_operacion,
      fecha_documento: movimiento.fecha_documento ?? "",
      almacen: movimiento.almacen,
      almacen_destino: movimiento.almacen_destino ?? "",
      glosa: movimiento.glosa,
      detalles: movimiento.detalles.map((detalle) => ({
        producto: detalle.producto,
        ubicacion: detalle.ubicacion ?? "",
        ubicacion_destino: detalle.ubicacion_destino ?? "",
        lote_serie: detalle.lote_serie ?? "",
        cantidad: detalle.cantidad,
        costo_unitario: detalle.costo_unitario,
      })),
    });
  }, [movimientoQuery.data, reset]);

  useEffect(() => {
    if (esEdicion) return;
    const operacion = operacionPorTipo[tipo] ?? "28";
    const comprobante = comprobantePorTipo[tipo] ?? "00";
    setValue("tipo_operacion_sunat", operacion);
    setValue("tipo_comprobante_sunat", comprobante);
    if (tipo === "TRANSFERENCIA" || tipo === "AJUSTE") {
      setValue("serie_comprobante", "0");
      setValue("numero_comprobante", "0");
    }
    if (tipo === "AJUSTE" && !getValues("direccion_ajuste")) {
      setValue("direccion_ajuste", "ENTRADA");
    }
    if (tipo !== "AJUSTE") setValue("direccion_ajuste", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, esEdicion]);

  const productos = useMemo(() => productosQuery.data?.results ?? [], [productosQuery.data]);
  const productosMap = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos],
  );
  const lotes = lotesQuery.data?.results ?? [];
  const totalEstimado = (detalles ?? []).reduce(
    (total, detalle) =>
      total + toNumber(detalle.cantidad) * toNumber(detalle.costo_unitario),
    0,
  );

  function productoDe(idProducto: string): Producto | undefined {
    return productosMap.get(idProducto);
  }

  async function nextStep() {
    if (step === 1) {
      const ok = await trigger([
        "tipo_movimiento",
        "almacen",
        "almacen_destino",
        "fecha_operacion",
        "direccion_ajuste",
      ]);
      if (!ok) return;
    }
    if (step === 2) {
      const ok = await trigger("detalles");
      if (!ok) return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  function buildPayload(values: MovimientoForm): MovimientoPayload {
    return {
      tipo_movimiento: values.tipo_movimiento,
      direccion_ajuste: values.direccion_ajuste,
      tipo_operacion_sunat:
        values.tipo_operacion_sunat || operacionPorTipo[values.tipo_movimiento],
      tipo_comprobante_sunat: values.tipo_comprobante_sunat || "00",
      serie_comprobante: values.serie_comprobante || "0",
      numero_comprobante: values.numero_comprobante || "0",
      fecha_operacion: values.fecha_operacion,
      fecha_documento: values.fecha_documento || null,
      almacen: values.almacen,
      almacen_destino:
        values.tipo_movimiento === "TRANSFERENCIA" ? values.almacen_destino : null,
      glosa: values.glosa,
      detalles: values.detalles.map((detalle) => ({
        producto: detalle.producto,
        ubicacion: detalle.ubicacion || null,
        ubicacion_destino:
          values.tipo_movimiento === "TRANSFERENCIA"
            ? detalle.ubicacion_destino || null
            : null,
        lote_serie: detalle.lote_serie || null,
        cantidad: detalle.cantidad,
        costo_unitario:
          values.tipo_movimiento === "ENTRADA" ||
          (values.tipo_movimiento === "AJUSTE" &&
            values.direccion_ajuste === "ENTRADA")
            ? detalle.costo_unitario
            : undefined,
      })),
    };
  }

  async function persist(values: MovimientoForm, confirmar: boolean) {
    if (confirmar) {
      for (const detalle of values.detalles) {
        const producto = productoDe(detalle.producto);
        if (producto?.control_lotes && !detalle.lote_serie) {
          toast.error(`El producto ${producto.sku} requiere lote o serie.`);
          return;
        }
        if (producto?.control_series && Number(detalle.cantidad) !== 1) {
          toast.error(`El producto ${producto.sku} controla series: cantidad debe ser 1.`);
          return;
        }
      }
    }
    setSaving(confirmar);
    setSavingDraft(!confirmar);
    try {
      const payload = buildPayload(values);
      const movimiento = esEdicion && id
        ? await movimientosApi.update(id, payload)
        : await movimientosApi.create(payload);
      if (confirmar) {
        await movimientosApi.confirmar(movimiento.id, crypto.randomUUID());
        toast.success("Movimiento confirmado");
      } else {
        toast.success(esEdicion ? "Borrador actualizado" : "Borrador guardado");
      }
      queryClient.invalidateQueries({ queryKey: ["movimientos", empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ["stock", empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ["kardex", empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", empresa?.id] });
      navigate(`/movimientos/${movimiento.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
      setSavingDraft(false);
    }
  }

  function guardarBorrador() {
    const values = getValues();
    if (!values.almacen) {
      toast.error("Selecciona un almacén.");
      return;
    }
    if (!values.fecha_operacion) {
      toast.error("Selecciona una fecha de operación.");
      return;
    }
    if (!values.detalles.length || values.detalles.some((detalle) => !detalle.producto || !detalle.cantidad)) {
      toast.error("Completa producto y cantidad en todos los detalles.");
      return;
    }
    if (
      values.tipo_movimiento === "TRANSFERENCIA" &&
      (!values.almacen_destino || values.almacen_destino === values.almacen)
    ) {
      toast.error("Selecciona un almacén destino distinto.");
      return;
    }
    void persist(values, false);
  }

  async function confirmarYGuardar(values: MovimientoForm) {
    await persist(values, true);
  }

  if (esEdicion && movimientoQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (esEdicion && movimientoQuery.data && movimientoQuery.data.estado !== "BORRADOR") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-600">
          Solo se pueden editar movimientos en borrador.
          <div className="mt-4">
            <Link to={`/movimientos/${id}`}>
              <Button variant="outline">Ver movimiento</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = [
    { number: 1, label: "Tipo y almacén" },
    { number: 2, label: "Detalles" },
    { number: 3, label: "Documento y revisión" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title={esEdicion ? "Editar borrador" : "Nuevo movimiento"}
        description="Completa los datos y confirma para afectar stock y kardex."
        actions={
          <Link to={esEdicion && id ? `/movimientos/${id}` : "/movimientos"}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Volver
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        {steps.map((item, index) => (
          <div key={item.number} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(item.number)}
              className={`flex items-center gap-2 text-xs font-semibold ${
                step >= item.number ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  step > item.number
                    ? "bg-emerald-600 text-white"
                    : step === item.number
                      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > item.number ? <Check className="h-3.5 w-3.5" /> : item.number}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`h-px flex-1 ${step > item.number ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(confirmarYGuardar)} className="space-y-5">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Tipo de movimiento</CardTitle>
              <CardDescription>
                Define la naturaleza, el almacén y la fecha de la operación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(["ENTRADA", "SALIDA", "TRANSFERENCIA", "AJUSTE"] as const).map((value) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      tipo === value
                        ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register("tipo_movimiento")}
                    />
                    <p className="text-sm font-bold text-slate-800">{tipoLabels[value]}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {value === "ENTRADA"
                        ? "Compra, saldo inicial o devolución"
                        : value === "SALIDA"
                          ? "Venta, consumo o merma"
                          : value === "TRANSFERENCIA"
                            ? "Mueve stock entre almacenes"
                            : "Corrige diferencias de inventario"}
                    </p>
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Almacén" htmlFor="almacen" error={errors.almacen?.message} required>
                  <Select id="almacen" {...register("almacen")}>
                    <option value="">Seleccionar…</option>
                    {almacenesQuery.data?.results.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.codigo} · {item.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                {tipo === "TRANSFERENCIA" && (
                  <Field
                    label="Almacén destino"
                    htmlFor="almacen_destino"
                    error={errors.almacen_destino?.message}
                    required
                  >
                    <Select id="almacen_destino" {...register("almacen_destino")}>
                      <option value="">Seleccionar…</option>
                      {almacenesQuery.data?.results
                        .filter((item) => item.id !== almacen)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.codigo} · {item.nombre}
                          </option>
                        ))}
                    </Select>
                  </Field>
                )}
                <Field label="Fecha de operación" htmlFor="fecha_operacion" error={errors.fecha_operacion?.message} required>
                  <Input id="fecha_operacion" type="date" max={todayIso()} {...register("fecha_operacion")} />
                </Field>
                {tipo === "AJUSTE" && (
                  <Field label="Dirección del ajuste" htmlFor="direccion_ajuste" error={errors.direccion_ajuste?.message}>
                    <Select id="direccion_ajuste" {...register("direccion_ajuste")}>
                      <option value="ENTRADA">Entrada</option>
                      <option value="SALIDA">Salida</option>
                    </Select>
                  </Field>
                )}
                <Field label="Glosa" htmlFor="glosa" className="sm:col-span-2">
                  <Input id="glosa" placeholder="Motivo o referencia del movimiento" {...register("glosa")} />
                </Field>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Detalles del movimiento</CardTitle>
                <CardDescription>
                  Agrega los productos, ubicaciones, lotes y cantidades.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() =>
                  append({
                    producto: "",
                    ubicacion: "",
                    ubicacion_destino: "",
                    lote_serie: "",
                    cantidad: "",
                    costo_unitario: "",
                  })
                }
              >
                Agregar línea
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.detalles?.root?.message && (
                <p className="text-xs text-rose-600">{errors.detalles.root.message}</p>
              )}
              {fields.map((field, index) => {
                const productoId = detalles?.[index]?.producto ?? "";
                const producto = productoDe(productoId);
                const lotesProducto = lotes.filter((lote) => lote.producto === productoId);
                const requiereCosto =
                  tipo === "ENTRADA" || (tipo === "AJUSTE" && watch("direccion_ajuste") === "ENTRADA");
                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Línea {index + 1}
                      </p>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="lg:col-span-4">
                        <Field
                          label="Producto"
                          error={errors.detalles?.[index]?.producto?.message}
                          required
                        >
                          <Select {...register(`detalles.${index}.producto`)}>
                            <option value="">Seleccionar…</option>
                            {productos.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} · {item.descripcion}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <div className="lg:col-span-3">
                        <Field label="Ubicación">
                          <Select {...register(`detalles.${index}.ubicacion`)} disabled={!almacen}>
                            <option value="">Sin ubicación</option>
                            {ubicacionesOrigen.data?.results.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.codigo}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <div className="lg:col-span-3">
                        <Field label="Lote / serie">
                          <Select {...register(`detalles.${index}.lote_serie`)} disabled={!productoId}>
                            <option value="">Sin lote</option>
                            {lotesProducto.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.numero_lote_serie}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <div className="lg:col-span-2">
                        <Field
                          label="Cantidad"
                          error={errors.detalles?.[index]?.cantidad?.message}
                          required
                        >
                          <Input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            placeholder="0"
                            {...register(`detalles.${index}.cantidad`)}
                          />
                        </Field>
                      </div>
                      {tipo === "TRANSFERENCIA" && (
                        <div className="lg:col-span-3">
                          <Field label="Ubicación destino">
                            <Select
                              {...register(`detalles.${index}.ubicacion_destino`)}
                              disabled={!almacenDestino}
                            >
                              <option value="">Sin ubicación</option>
                              {ubicacionesDestino.data?.results.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.codigo}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                      )}
                      {requiereCosto && (
                        <div className="lg:col-span-3">
                          <Field
                            label="Costo unitario"
                            error={errors.detalles?.[index]?.costo_unitario?.message}
                            required
                          >
                            <Input
                              type="number"
                              step="0.00000001"
                              min="0"
                              placeholder="0.00000000"
                              {...register(`detalles.${index}.costo_unitario`)}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                    {producto && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge tone={producto.metodo_valuacion === "2" ? "sky" : "violet"}>
                          {producto.metodo_valuacion === "2" ? "FIFO" : "Promedio"}
                        </Badge>
                        {producto.control_lotes && <Badge tone="amber">Requiere lote</Badge>}
                        {producto.control_series && <Badge tone="amber">Serie · cantidad 1</Badge>}
                        <span className="text-[11px] text-slate-500">
                          Stock mínimo: {formatQuantity(producto.stock_minimo, 2)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Total estimado
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Solo entradas con costo unitario.
                  </p>
                </div>
                <p className="text-lg font-black tabular-nums text-emerald-800">
                  {formatMoney(totalEstimado)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Documento y operación SUNAT</CardTitle>
                <CardDescription>
                  Estos datos se congelan en el kardex para el PLE.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de operación" htmlFor="tipo_operacion_sunat" error={errors.tipo_operacion_sunat?.message}>
                  <Select
                    id="tipo_operacion_sunat"
                    {...register("tipo_operacion_sunat")}
                    disabled={tipo === "TRANSFERENCIA" || tipo === "AJUSTE"}
                  >
                    {operaciones.data?.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {item.codigo} · {item.descripcion}
                      </option>
                    )) ?? (
                      <>
                        <option value="02">02 · Compra nacional</option>
                        <option value="01">01 · Venta nacional</option>
                      </>
                    )}
                  </Select>
                </Field>
                <Field label="Tipo de comprobante" htmlFor="tipo_comprobante_sunat" error={errors.tipo_comprobante_sunat?.message}>
                  <Select id="tipo_comprobante_sunat" {...register("tipo_comprobante_sunat")}>
                    {comprobantes.data?.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {item.codigo} · {item.descripcion}
                      </option>
                    )) ?? (
                      <>
                        <option value="00">00 · Otros</option>
                        <option value="01">01 · Factura</option>
                      </>
                    )}
                  </Select>
                </Field>
                <Field label="Serie" htmlFor="serie_comprobante" error={errors.serie_comprobante?.message}>
                  <Input id="serie_comprobante" placeholder="F001" {...register("serie_comprobante")} />
                </Field>
                <Field label="Número" htmlFor="numero_comprobante" error={errors.numero_comprobante?.message}>
                  <Input id="numero_comprobante" placeholder="00000001" {...register("numero_comprobante")} />
                </Field>
                <Field label="Fecha del documento" htmlFor="fecha_documento">
                  <Input id="fecha_documento" type="date" {...register("fecha_documento")} />
                </Field>
                <Field label="Glosa" htmlFor="glosa_revision" className="sm:col-span-2">
                  <Textarea id="glosa_revision" className="min-h-20" {...register("glosa")} />
                </Field>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Revisión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Tipo</span>
                  <span className="font-semibold text-slate-800">{tipoLabels[tipo]}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Almacén</span>
                  <span className="text-right font-medium text-slate-800">
                    {almacenesQuery.data?.results.find((item) => item.id === almacen)?.nombre ?? "—"}
                    {tipo === "TRANSFERENCIA" && (
                      <span className="block text-[11px] text-slate-500">
                        → {almacenesQuery.data?.results.find((item) => item.id === almacenDestino)?.nombre ?? "—"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Fecha</span>
                  <span className="font-medium text-slate-800">{fechaOperacion || "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Líneas</span>
                  <span className="font-semibold text-slate-800">{fields.length}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                  <span className="text-slate-500">Total estimado</span>
                  <span className="font-black text-emerald-700">{formatMoney(totalEstimado)}</span>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
                  Confirmar afecta stock y kardex de forma definitiva. Si tienes dudas,
                  guarda el borrador y revísalo después.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}>
                Anterior
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={guardarBorrador} loading={savingDraft}>
              <Save className="h-4 w-4" />
              Guardar borrador
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={nextStep} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continuar
              </Button>
            ) : (
              <Button
                type="submit"
                loading={saving}
                leftIcon={<ClipboardCheck className="h-4 w-4" />}
              >
                Guardar y confirmar
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
