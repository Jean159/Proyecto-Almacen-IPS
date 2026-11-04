import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { almacenesApi } from "@/api/almacenes";
import { pleApi } from "@/api/ple";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatPeriodo } from "@/lib/format";
import { monthOptions } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { PleError, PlePreview } from "@/types/domain";

type Libro = "12.1" | "13.1";

export function PlePage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const months = useMemo(() => monthOptions(18), []);
  const [periodo, setPeriodo] = useState(months[0]?.value ?? "");
  const [libro, setLibro] = useState<Libro>("13.1");
  const [almacen, setAlmacen] = useState("");
  const [consultar, setConsultar] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const [anio, mes] = periodo.split("-").map(Number);
  const params = { libro, anio, mes, almacen: almacen || undefined };

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });

  const previewQuery = useQuery({
    queryKey: queryKeys.plePreview(empresa?.id, params),
    queryFn: () => pleApi.preview(params),
    enabled: Boolean(empresa && consultar && anio && mes),
  });

  const historialQuery = useQuery({
    queryKey: queryKeys.pleHistorial(empresa?.id),
    queryFn: pleApi.historial,
    enabled: Boolean(empresa),
  });

  async function descargar() {
    if (!previewQuery.data) {
      toast.error("Primero valida el libro.");
      return;
    }
    setDescargando(true);
    try {
      const filename = await pleApi.descargar(params);
      toast.success(`Archivo generado: ${filename}`);
      queryClient.invalidateQueries({ queryKey: ["ple-historial", empresa?.id] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDescargando(false);
    }
  }

  const preview = previewQuery.data;

  return (
    <div>
      <PageHeader
        eyebrow="Cumplimiento SUNAT"
        title="Centro PLE"
        description="Valida y descarga los libros 12.1 y 13.1 con la estructura oficial."
        actions={
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => setConsultar(true)}
          >
            Validar
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Parámetros del libro</CardTitle>
            <CardDescription>
              Selecciona el periodo y el libro. La validación se ejecuta antes de
              permitir la descarga.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Periodo">
                <Select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Almacén">
                <Select value={almacen} onChange={(event) => setAlmacen(event.target.value)}>
                  <option value="">Todos los almacenes</option>
                  {almacenesQuery.data?.results.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.codigo} · {item.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Libro">
                <Tabs
                  value={libro}
                  onChange={(value) => setLibro(value as Libro)}
                  items={[
                    { value: "12.1", label: "12.1 Físico" },
                    { value: "13.1", label: "13.1 Valorizado" },
                  ]}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setConsultar(true)}
                loading={previewQuery.isFetching}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Validar libro
              </Button>
              <Button
                variant="secondary"
                onClick={descargar}
                loading={descargando}
                disabled={!preview || preview.errores.length > 0}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Descargar .TXT
              </Button>
            </div>
          </CardContent>

          {previewQuery.isError && (
            <CardContent className="border-t border-rose-100 bg-rose-50/60 text-sm text-rose-700">
              {errorMessage(previewQuery.error)}
            </CardContent>
          )}

          {preview && (
            <CardContent className="border-t border-slate-100">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Libro {preview.libro} · {formatPeriodo(preview.periodo)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {preview.nombre_archivo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="navy">{preview.cantidad_registros} registros</Badge>
                  {preview.errores.length === 0 ? (
                    <Badge tone="emerald">Válido</Badge>
                  ) : (
                    <Badge tone="rose">{preview.errores.length} error(es)</Badge>
                  )}
                </div>
              </div>

              {preview.errores.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-800">
                    <AlertTriangle className="h-4 w-4" />
                    Corrige estos errores antes de descargar
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-rose-700">
                        <tr>
                          <th className="py-1 pr-3">Línea</th>
                          <th className="py-1 pr-3">Campo</th>
                          <th className="py-1">Mensaje</th>
                        </tr>
                      </thead>
                      <tbody className="text-rose-700/90">
                        {preview.errores.map((error, index) => (
                          <tr key={`${error.linea}-${error.campo}-${index}`}>
                            <td className="py-0.5 pr-3 font-mono">{error.linea}</td>
                            <td className="py-0.5 pr-3 font-mono">{error.campo}</td>
                            <td className="py-0.5">{error.mensaje}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview.cantidad_registros === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-500">
                  No hay movimientos en el periodo. El archivo se generaría con indicador
                  de contenido 0.
                </div>
              ) : (
                <PlePreviewTable preview={preview} />
              )}
            </CardContent>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                Estructura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-5 text-slate-600">
              <p>
                <span className="font-bold text-slate-800">12.1</span> registra
                entradas y salidas en unidades físicas.
              </p>
              <p>
                <span className="font-bold text-slate-800">13.1</span> agrega costo
                unitario, costo total y saldo valorizado.
              </p>
              <p className="rounded-lg bg-slate-50 p-3 text-[11px]">
                Las salidas se emiten negativas. La primera fila de cada producto es el
                saldo inicial (operación 16).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historialQuery.isLoading ? (
                <p className="text-xs text-slate-500">Cargando…</p>
              ) : historialQuery.data?.length ? (
                historialQuery.data.slice(0, 8).map((item) => (
                  <div key={item.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">
                        {item.libro} · {item.anio}-{String(item.mes).padStart(2, "0")}
                      </p>
                      <Badge tone="slate">{item.cantidad_registros}</Badge>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                      {item.nombre_archivo}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDateTime(item.creado_en)} · {item.usuario_email || "Sistema"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Aún no hay exportaciones.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PlePreviewTable({ preview }: { preview: PlePreview }) {
  const rows = preview.lineas.slice(0, 300).map((linea, index) => {
    const parts = linea.split("|");
    return { index: index + 1, parts };
  });
  const errorLines = new Set(preview.errores.map((error: PleError) => error.linea));

  if (preview.libro === "12.1") {
    return (
      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-[11px]">
          <thead className="sticky top-0 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-2 py-2">Línea</th>
              <th className="px-2 py-2">Fecha</th>
              <th className="px-2 py-2">Operación</th>
              <th className="px-2 py-2">Documento</th>
              <th className="px-2 py-2">Código</th>
              <th className="px-2 py-2">Descripción</th>
              <th className="px-2 py-2 text-right">Entrada</th>
              <th className="px-2 py-2 text-right">Salida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ index, parts }) => (
              <tr key={index} className={errorLines.has(index) ? "bg-rose-50" : ""}>
                <td className="px-2 py-1.5 font-mono text-slate-400">{index}</td>
                <td className="px-2 py-1.5">{parts[9]}</td>
                <td className="px-2 py-1.5">{parts[13]}</td>
                <td className="px-2 py-1.5">
                  {parts[10]}-{parts[11]}-{parts[12]}
                </td>
                <td className="px-2 py-1.5 font-mono">{parts[6]}</td>
                <td className="max-w-[220px] truncate px-2 py-1.5">{parts[14]}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{parts[16]}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-rose-700">
                  {parts[17]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[1100px] text-left text-[11px]">
        <thead className="sticky top-0 bg-slate-100 text-slate-500">
          <tr>
            <th className="px-2 py-2">Línea</th>
            <th className="px-2 py-2">Fecha</th>
            <th className="px-2 py-2">Operación</th>
            <th className="px-2 py-2">Documento</th>
            <th className="px-2 py-2">Código</th>
            <th className="px-2 py-2">Descripción</th>
            <th className="px-2 py-2 text-right">Entrada</th>
            <th className="px-2 py-2 text-right">Salida</th>
            <th className="px-2 py-2 text-right">Saldo</th>
            <th className="px-2 py-2 text-right">Costo saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ index, parts }) => (
            <tr key={index} className={errorLines.has(index) ? "bg-rose-50" : ""}>
              <td className="px-2 py-1.5 font-mono text-slate-400">{index}</td>
              <td className="px-2 py-1.5">{parts[9]}</td>
              <td className="px-2 py-1.5">{parts[13]}</td>
              <td className="px-2 py-1.5">
                {parts[10]}-{parts[11]}-{parts[12]}
              </td>
              <td className="px-2 py-1.5 font-mono">{parts[6]}</td>
              <td className="max-w-[220px] truncate px-2 py-1.5">{parts[14]}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{parts[17]}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-rose-700">
                {parts[20]}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{parts[23]}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{parts[25]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
