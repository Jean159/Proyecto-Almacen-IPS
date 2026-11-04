import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { catalogoApi } from "@/api/catalogo";
import { RoleGate } from "@/components/layout/RoleGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { formatQuantity } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { Producto } from "@/types/domain";

export function ProductosPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [activo, setActivo] = useState("");
  const [metodo, setMetodo] = useState("");
  const debouncedSearch = useDebounce(search);
  const pageSize = 20;

  const categoriasQuery = useQuery({
    queryKey: queryKeys.categorias(empresa?.id, { page_size: 200 }),
    queryFn: () => catalogoApi.categorias({ page_size: 200 }),
    enabled: Boolean(empresa),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.productos(empresa?.id, {
      page,
      search: debouncedSearch,
      categoria,
      activo,
      metodo,
    }),
    queryFn: () =>
      catalogoApi.productos({
        page,
        page_size: pageSize,
        search: debouncedSearch,
        categoria: categoria || undefined,
        activo: activo === "" ? undefined : activo === "true",
        metodo_valuacion: metodo || undefined,
      }),
    enabled: Boolean(empresa),
  });

  const columns: DataTableColumn<Producto>[] = [
    {
      key: "sku",
      header: "Producto",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.sku}</p>
          <p className="max-w-xs truncate text-[11px] text-slate-500">{row.descripcion}</p>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      render: (row) => (
        <span className="text-xs text-slate-600">{row.categoria_nombre || "—"}</span>
      ),
    },
    {
      key: "sunat",
      header: "SUNAT",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{row.tipo_existencia_display || row.tipo_existencia}</p>
          <p className="text-[11px] text-slate-400">
            {row.unidad_medida_display || row.unidad_medida} · {row.codigo_propio_sunat}
          </p>
        </div>
      ),
    },
    {
      key: "metodo",
      header: "Valuación",
      render: (row) => (
        <Badge tone={row.metodo_valuacion === "2" ? "sky" : "violet"}>
          {row.metodo_valuacion === "2" ? "FIFO" : row.metodo_valuacion === "1" ? "Promedio" : "Específica"}
        </Badge>
      ),
    },
    {
      key: "stock",
      header: "Mínimo",
      align: "right",
      render: (row) => (
        <span className="numeric text-xs text-slate-600">
          {formatQuantity(row.stock_minimo, 2)}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <Badge tone={row.activo ? "emerald" : "slate"}>
          {row.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <RoleGate permission="catalog:write">
          <Link to={`/catalogo/productos/${row.id}`}>
            <Button variant="ghost" size="sm" title="Editar producto">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </RoleGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Administra SKU, códigos SUNAT, controles de lote y método de valuación."
        actions={
          <RoleGate permission="catalog:write">
            <Link to="/catalogo/productos/nuevo">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Nuevo producto</Button>
            </Link>
          </RoleGate>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_200px_180px_170px]">
          <SearchInput
            placeholder="Buscar por SKU, código o descripción…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Field label="Categoría">
            <Select
              value={categoria}
              onChange={(event) => {
                setCategoria(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {categoriasQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valuación">
            <Select
              value={metodo}
              onChange={(event) => {
                setMetodo(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              <option value="1">Promedio ponderado</option>
              <option value="2">FIFO</option>
              <option value="5">Identificación específica</option>
            </Select>
          </Field>
          <Field label="Estado">
            <Select
              value={activo}
              onChange={(event) => {
                setActivo(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </Select>
          </Field>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={PackageSearch}
          emptyTitle="Sin productos"
          emptyDescription="Crea tu primer producto para empezar a mover inventario."
        />
        {data && data.count > pageSize && (
          <Pagination page={page} pageSize={pageSize} count={data.count} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
