import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, ScrollText } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { almacenesApi } from "@/api/almacenes";
import { catalogoApi } from "@/api/catalogo";
import { kardexApi } from "@/api/kardex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { errorMessage } from "@/lib/errors";
import {
  formatDate,
  formatMoney,
  formatQuantity,
  formatUnitCost,
} from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { KardexFila } from "@/types/domain";

type Modo = "VALORIZADO" | "FISICO";

export function KardexPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const [searchParams] = useSearchParams();
  const [modo, setModo] = useState<Modo>("VALORIZADO");
  const [producto, setProducto] = useState(searchParams.get("producto") ?? "");
  const [almacen, setAlmacen] = useState(searchParams.get("almacen") ?? "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [exportando, setExportando] = useState(false);
  const pageSize = 100;

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });
  const productosQuery = useQuery({
    queryKey: queryKeys.productos(empresa?.id, { page_size: 200 }),
    queryFn: () => catalogoApi.productos({ page_size: 200 }),
    enabled: Boolean(empresa),
  });

  const params = {
    producto: producto || undefined,
    almacen: almacen || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  };

  const valorizadoQuery = useQuery({
    queryKey: queryKeys.kardex(empresa?.id, { ...params, page }),
    queryFn: () => kardexApi.list({ ...params, page, page_size: pageSize }),
    enabled: Boolean(empresa) && modo === "VALORIZADO",
  });
  const fisicoQuery = useQuery({
    queryKey: queryKeys.kardexFisico(empresa?.id, { ...params, page }),
    queryFn: () => kardexApi.fisico({ ...params, page, page_size: pageSize }),
    enabled: Boolean(empresa) && modo === "FISICO",
  });

  const data = modo === "VALORIZADO" ? valorizadoQuery.data : fisicoQuery.data;
  const loading = modo === "VALORIZADO" ? valorizadoQuery.isLoading : fisicoQuery.isLoading;
  const error = modo === "VALORIZADO" ? valorizadoQuery.error : fisicoQuery.error;

  const filas = useMemo(() => data?.results ?? [], [data]);
  const resumen = useMemo(() => {
    const entradas = filas.reduce(
      (total, fila) => total + Number(fila.cantidad_entrada),
      0,
    );
    const salidas = filas.reduce(
      (total, fila) => total + Number(fila.cantidad_salida),
      0,
    );
    const ultima = filas[filas.length - 1];
    const valor =
      modo === "VALORIZADO"
        ? Number((ultima as KardexFila | undefined)?.costo_total_saldo ?? 0)
        : 0;
    return { entradas, salidas, saldo: ultima?.cantidad_saldo ?? "0", valor };
  }, [filas, modo]);

  async function exportar() {
    setExportando(true);
    try {
      await kardexApi.exportar({
        modo: modo === "VALORIZADO" ? "valorizado" : "fisico",
        ...params,
      });
      toast.success("Archivo Excel generado");
    } catch (exportError) {
      toast.error(errorMessage(exportError));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventario permanente"
        title="Kardex"
        description="Consulta el libro auxiliar valorizado o en unidades físicas, con trazabilidad SUNAT."
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            loading={exportando}
            onClick={exportar}
          >
            Exportar Excel
          </Button>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[1fr_220px_150px_150px]">
          <Field label="Producto">
            <Select
              value={producto}
              onChange={(event) => {
                setProducto(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los productos</option>
              {productosQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} · {item.descripcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Almacén">
            <Select
              value={almacen}
              onChange={(event) => {
                setAlmacen(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {almacenesQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} · {item.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Desde">
            <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={modo}
            onChange={(value) => {
              setModo(value as Modo);
              setPage(1);
            }}
            items={[
              { value: "VALORIZADO", label: "Valorizado 13.1" },
              { value: "FISICO", label: "Unidades físicas 12.1" },
            ]}
          />
          <p className="text-xs text-slate-500">{data?.count ?? 0} registro(s)</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8" />
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-rose-600">
            {errorMessage(error)}
          </div>
        ) : !filas.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <ScrollText className="h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-800">Sin movimientos de kardex</p>
            <p className="mt-1 text-xs text-slate-500">
              Ajusta los filtros o confirma un movimiento para ver el libro.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:grid-cols-4">
              <Resumen label="Entradas" value={formatQuantity(resumen.entradas, 2)} tone="emerald" />
              <Resumen label="Salidas" value={formatQuantity(resumen.salidas, 2)} tone="rose" />
              <Resumen label="Saldo final" value={formatQuantity(resumen.saldo, 2)} tone="navy" />
              {modo === "VALORIZADO" && (
                <Resumen label="Valor saldo" value={formatMoney(resumen.valor)} tone="navy" />
              )}
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[1100px] border-collapse text-xs">
                <thead>
                  <tr className="bg-navy-950 text-white">
                    <Th rowSpan={2}>Fecha</Th>
                    <Th rowSpan={2}>Operación</Th>
                    <Th rowSpan={2}>Comprobante</Th>
                    <Th rowSpan={2}>Producto</Th>
                    <Th rowSpan={2}>Almacén</Th>
                    <Th colSpan={modo === "VALORIZADO" ? 3 : 1} className="bg-emerald-900/90">
                      ENTRADAS
                    </Th>
                    <Th colSpan={modo === "VALORIZADO" ? 3 : 1} className="bg-rose-900/90">
                      SALIDAS
                    </Th>
                    <Th colSpan={modo === "VALORIZADO" ? 3 : 1} className="bg-sky-900/90">
                      SALDO
                    </Th>
                  </tr>
                  <tr className="bg-slate-800 text-slate-200">
                    <Th align="right">Cant.</Th>
                    {modo === "VALORIZADO" && <Th align="right">C.U.</Th>}
                    {modo === "VALORIZADO" && <Th align="right">Total</Th>}
                    <Th align="right">Cant.</Th>
                    {modo === "VALORIZADO" && <Th align="right">C.U.</Th>}
                    {modo === "VALORIZADO" && <Th align="right">Total</Th>}
                    <Th align="right">Cant.</Th>
                    {modo === "VALORIZADO" && <Th align="right">C.U.</Th>}
                    {modo === "VALORIZADO" && <Th align="right">Total</Th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((fila) => (
                    <tr key={fila.id} className="hover:bg-slate-50">
                      <Td>{formatDate(fila.fecha_operacion)}</Td>
                      <Td>{fila.tipo_operacion}</Td>
                      <Td>
                        {fila.serie_comprobante}-{fila.numero_comprobante}
                      </Td>
                      <Td>
                        <span className="font-semibold text-slate-800">{fila.producto_sku}</span>
                        <span className="block max-w-[220px] truncate text-[11px] text-slate-500">
                          {fila.producto_descripcion}
                        </span>
                      </Td>
                      <Td>{fila.almacen_codigo}</Td>
                      <Td align="right" tone="entrada">
                        {formatQuantity(fila.cantidad_entrada, 2)}
                      </Td>
                      {modo === "VALORIZADO" && (
                        <>
                          <Td align="right">{formatUnitCost((fila as KardexFila).costo_unitario_entrada)}</Td>
                          <Td align="right">{formatMoney((fila as KardexFila).costo_total_entrada)}</Td>
                        </>
                      )}
                      <Td align="right" tone="salida">
                        {Number(fila.cantidad_salida) > 0
                          ? `-${formatQuantity(fila.cantidad_salida, 2)}`
                          : "0.00"}
                      </Td>
                      {modo === "VALORIZADO" && (
                        <>
                          <Td align="right">{formatUnitCost((fila as KardexFila).costo_unitario_salida)}</Td>
                          <Td align="right" tone="salida">
                            {Number((fila as KardexFila).costo_total_salida) > 0
                              ? `-${formatMoney((fila as KardexFila).costo_total_salida)}`
                              : formatMoney(0)}
                          </Td>
                        </>
                      )}
                      <Td align="right" tone="saldo">
                        {formatQuantity(fila.cantidad_saldo, 2)}
                      </Td>
                      {modo === "VALORIZADO" && (
                        <>
                          <Td align="right">{formatUnitCost((fila as KardexFila).costo_unitario_saldo)}</Td>
                          <Td align="right" tone="saldo">
                            {formatMoney((fila as KardexFila).costo_total_saldo)}
                          </Td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.count > pageSize && (
              <Pagination page={page} pageSize={pageSize} count={data.count} onPageChange={setPage} />
            )}
          </>
        )}
      </Card>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        El kardex es inmutable: las correcciones se registran con contra-movimientos.
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
  rowSpan,
  colSpan,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  rowSpan?: number;
  colSpan?: number;
  className?: string;
}) {
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`whitespace-nowrap border-r border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
        align === "right" ? "text-right" : "text-left"
      } ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  tone,
}: {
  children: ReactNode;
  align?: "left" | "right";
  tone?: "entrada" | "salida" | "saldo";
}) {
  const tones = {
    entrada: "font-semibold text-emerald-700",
    salida: "font-semibold text-rose-700",
    saldo: "bg-slate-50 font-bold text-slate-900",
  };
  return (
    <td
      className={`whitespace-nowrap px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${
        tone ? tones[tone] : "text-slate-600"
      }`}
    >
      {children}
    </td>
  );
}

function Resumen({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "navy";
}) {
  const tones = {
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    navy: "text-slate-900",
  };
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-black tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
}
