import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  PackageSearch,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { almacenesApi } from "@/api/almacenes";
import { inventarioApi } from "@/api/inventario";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Field";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatQuantity } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { StockSaldo } from "@/types/domain";

export function StockPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [almacen, setAlmacen] = useState("");
  const [bajoMinimo, setBajoMinimo] = useState(false);
  const [conStock, setConStock] = useState(false);
  const [porVencer, setPorVencer] = useState(false);
  const [tabAlertas, setTabAlertas] = useState("bajo");
  const debouncedSearch = useDebounce(search);
  const pageSize = 25;

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.stock(empresa?.id, {
      page,
      search: debouncedSearch,
      almacen,
      bajoMinimo,
      conStock,
      porVencer,
    }),
    queryFn: () =>
      inventarioApi.stock({
        page,
        page_size: pageSize,
        search: debouncedSearch,
        almacen: almacen || undefined,
        bajo_minimo: bajoMinimo || undefined,
        con_stock: conStock || undefined,
        por_vencer: porVencer || undefined,
      }),
    enabled: Boolean(empresa),
  });

  const alertasQuery = useQuery({
    queryKey: queryKeys.stockAlertas(empresa?.id),
    queryFn: inventarioApi.stockAlertas,
    enabled: Boolean(empresa),
  });

  const columns: DataTableColumn<StockSaldo>[] = [
    {
      key: "producto",
      header: "Producto",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.producto_sku}</p>
          <p className="max-w-xs truncate text-[11px] text-slate-500">
            {row.producto_descripcion}
          </p>
        </div>
      ),
    },
    {
      key: "almacen",
      header: "Almacén / ubicación",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-700">{row.almacen_nombre}</p>
          <p>
            {row.ubicacion_codigo || "Sin ubicación"}
            {row.lote_numero ? ` · ${row.lote_numero}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "fisica",
      header: "Física",
      align: "right",
      render: (row) => (
        <span className="numeric text-sm font-semibold text-slate-800">
          {formatQuantity(row.cantidad_fisica, 2)}
        </span>
      ),
    },
    {
      key: "reservada",
      header: "Reservada",
      align: "right",
      render: (row) => (
        <span className="numeric text-xs text-amber-700">
          {formatQuantity(row.cantidad_reservada, 2)}
        </span>
      ),
    },
    {
      key: "disponible",
      header: "Disponible",
      align: "right",
      render: (row) => (
        <span className="numeric text-sm font-bold text-emerald-700">
          {formatQuantity(row.cantidad_disponible, 2)}
        </span>
      ),
    },
    {
      key: "vencimiento",
      header: "Vencimiento",
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-600">{formatDate(row.lote_fecha_vencimiento)}</p>
          {row.lote_numero && <p className="text-[10px] text-slate-400">{row.lote_numero}</p>}
        </div>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.bajo_minimo && <Badge tone="amber">Bajo mínimo</Badge>}
          <Link to={`/kardex?producto=${row.producto}&almacen=${row.almacen}`}>
            <Button variant="ghost" size="sm" title="Ver kardex">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const alertas = alertasQuery.data;
  const alertasActuales =
    tabAlertas === "bajo" ? alertas?.bajo_minimo ?? [] : alertas?.por_vencer ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Stock en tiempo real"
        description="Consulta existencias por almacén, ubicación y lote; identifica quiebres y vencimientos."
        actions={
          <Link to="/stock/reservas">
            <Button variant="outline" leftIcon={<CalendarClock className="h-4 w-4" />}>
              Reservas
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <Card>
          <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_240px]">
            <SearchInput
              placeholder="Buscar producto, SKU o almacén…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
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
          </div>
          <div className="flex flex-wrap gap-5 border-b border-slate-100 px-4 py-3">
            <Checkbox
              label="Bajo mínimo"
              checked={bajoMinimo}
              onChange={(event) => {
                setBajoMinimo(event.target.checked);
                setPage(1);
              }}
            />
            <Checkbox
              label="Con stock"
              checked={conStock}
              onChange={(event) => {
                setConStock(event.target.checked);
                setPage(1);
              }}
            />
            <Checkbox
              label="Por vencer (30 días)"
              checked={porVencer}
              onChange={(event) => {
                setPorVencer(event.target.checked);
                setPage(1);
              }}
            />
          </div>
          <DataTable
            columns={columns}
            data={data?.results ?? []}
            rowKey={(row) => row.id}
            loading={isLoading}
            error={error ? errorMessage(error) : null}
            emptyIcon={PackageSearch}
            emptyTitle="Sin resultados de stock"
            emptyDescription="Ajusta los filtros o registra una entrada de mercadería."
          />
          {data && data.count > pageSize && (
            <Pagination page={page} pageSize={pageSize} count={data.count} onPageChange={setPage} />
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={tabAlertas}
              onChange={setTabAlertas}
              items={[
                { value: "bajo", label: "Bajo mínimo", count: alertas?.bajo_minimo.length },
                { value: "vencer", label: "Por vencer", count: alertas?.por_vencer.length },
              ]}
            />
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {alertasQuery.isLoading ? (
                <p className="py-6 text-center text-xs text-slate-500">Cargando alertas…</p>
              ) : alertasActuales.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center">
                  <Boxes className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-500">
                    {tabAlertas === "bajo"
                      ? "No hay productos bajo mínimo."
                      : "No hay lotes próximos a vencer."}
                  </p>
                </div>
              ) : (
                alertasActuales.map((item) => (
                  <Link
                    key={item.id}
                    to={`/kardex?producto=${item.producto}&almacen=${item.almacen}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:border-amber-200 hover:bg-amber-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {item.producto_sku}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {item.almacen_codigo} · {item.almacen_nombre}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="numeric text-xs font-bold text-amber-700">
                        {formatQuantity(item.cantidad_fisica, 2)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {tabAlertas === "bajo"
                          ? "física"
                          : formatDate(item.lote_fecha_vencimiento)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
