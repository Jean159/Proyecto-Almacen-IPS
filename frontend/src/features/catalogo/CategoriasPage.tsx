import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { catalogoApi, type CategoriaPayload } from "@/api/catalogo";
import { RoleGate } from "@/components/layout/RoleGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import type { CategoriaForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { CategoriaProducto } from "@/types/domain";
import { CategoriaFormModal } from "@/features/catalogo/CategoriaFormModal";

export function CategoriasPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<CategoriaProducto | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.categorias(empresa?.id),
    queryFn: () => catalogoApi.categorias({ page_size: 200 }),
    enabled: Boolean(empresa),
  });

  const guardar = useMutation({
    mutationFn: (values: CategoriaForm) => {
      const payload: CategoriaPayload = {
        nombre: values.nombre,
        parent: values.parent || null,
        cuenta_contable_inventario: values.cuenta_contable_inventario,
        cuenta_contable_costo_venta: values.cuenta_contable_costo_venta,
        activo: values.activo,
      };
      return editando
        ? catalogoApi.actualizarCategoria(editando.id, payload)
        : catalogoApi.crearCategoria(payload);
    },
    onSuccess: () => {
      toast.success(editando ? "Categoría actualizada" : "Categoría creada");
      setModalOpen(false);
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["categorias", empresa?.id] });
    },
  });

  const categorias = useMemo(() => data?.results ?? [], [data]);
  const filtradas = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return categorias;
    return categorias.filter(
      (item) =>
        item.nombre.toLowerCase().includes(term) ||
        item.parent_nombre?.toLowerCase().includes(term),
    );
  }, [categorias, search]);

  const columns: DataTableColumn<CategoriaProducto>[] = [
    {
      key: "nombre",
      header: "Categoría",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.nombre}</p>
          <p className="text-[11px] text-slate-500">
            {row.parent_nombre ? `Depende de ${row.parent_nombre}` : "Categoría raíz"}
          </p>
        </div>
      ),
    },
    {
      key: "cuentas",
      header: "Cuentas PCGE",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>Inventario: {row.cuenta_contable_inventario}</p>
          <p>Costo: {row.cuenta_contable_costo_venta}</p>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <Badge tone={row.activo ? "emerald" : "slate"}>
          {row.activo ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <RoleGate permission="catalog:write">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditando(row);
              setModalOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </RoleGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Categorías"
        description="Agrupa productos y define sus cuentas contables de referencia."
        actions={
          <RoleGate permission="catalog:write">
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
            >
              Nueva categoría
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            className="w-full sm:max-w-xs"
            placeholder="Buscar categoría…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="text-xs text-slate-500">{filtradas.length} categoría(s)</p>
        </div>
        <DataTable
          columns={columns}
          data={filtradas}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={Tags}
          emptyTitle="Sin categorías"
          emptyDescription="Crea una categoría para clasificar tus productos."
        />
      </Card>

      <CategoriaFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditando(null);
        }}
        categoria={editando}
        categorias={categorias}
        onSubmit={async (values) => {
          await guardar.mutateAsync(values);
        }}
      />
      {guardar.isError && (
        <p className="mt-2 text-xs text-rose-600">{errorMessage(guardar.error)}</p>
      )}
    </div>
  );
}
