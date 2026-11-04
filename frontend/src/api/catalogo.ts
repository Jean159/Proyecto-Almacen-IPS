import { api, cleanParams } from "@/api/client";
import type {
  CategoriaProducto,
  ListParams,
  LoteSerie,
  Paginated,
  Producto,
} from "@/types/domain";

export interface CategoriaPayload {
  nombre: string;
  parent?: string | null;
  cuenta_contable_inventario?: string;
  cuenta_contable_costo_venta?: string;
  activo?: boolean;
}

export interface ProductoPayload {
  sku: string;
  codigo_barras?: string;
  descripcion: string;
  categoria?: string | null;
  tipo_existencia: string;
  unidad_medida: string;
  catalogo_tipo: "1" | "3" | "9";
  codigo_propio_sunat: string;
  catalogo_internacional?: "1" | "3" | "";
  codigo_internacional?: string;
  cubso_osce?: string;
  metodo_valuacion: "1" | "2" | "5";
  control_lotes?: boolean;
  control_series?: boolean;
  stock_minimo?: string;
  stock_maximo?: string;
  punto_reorden?: string;
  atributos_extra?: Record<string, unknown>;
  activo?: boolean;
}

export interface LotePayload {
  producto: string;
  numero_lote_serie: string;
  fecha_fabricacion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: "DISPONIBLE" | "CUARENTENA" | "VENCIDO";
  activo?: boolean;
}

export const catalogoApi = {
  categorias: (params: ListParams = {}) =>
    api
      .get<Paginated<CategoriaProducto>>("/categorias/", {
        params: cleanParams({ page_size: 200, ...params }),
      })
      .then((response) => response.data),
  crearCategoria: (payload: CategoriaPayload) =>
    api
      .post<CategoriaProducto>("/categorias/", payload)
      .then((response) => response.data),
  actualizarCategoria: (id: string, payload: Partial<CategoriaPayload>) =>
    api
      .patch<CategoriaProducto>(`/categorias/${id}/`, payload)
      .then((response) => response.data),
  eliminarCategoria: (id: string) => api.delete(`/categorias/${id}/`),

  productos: (params: ListParams = {}) =>
    api
      .get<Paginated<Producto>>("/productos/", {
        params: cleanParams({ page_size: 50, ...params }),
      })
      .then((response) => response.data),
  producto: (id: string) =>
    api.get<Producto>(`/productos/${id}/`).then((response) => response.data),
  crearProducto: (payload: ProductoPayload) =>
    api
      .post<Producto>("/productos/", payload)
      .then((response) => response.data),
  actualizarProducto: (id: string, payload: Partial<ProductoPayload>) =>
    api
      .patch<Producto>(`/productos/${id}/`, payload)
      .then((response) => response.data),
  eliminarProducto: (id: string) => api.delete(`/productos/${id}/`),

  lotes: (params: ListParams = {}) =>
    api
      .get<Paginated<LoteSerie>>("/lotes/", {
        params: cleanParams({ page_size: 100, ...params }),
      })
      .then((response) => response.data),
  crearLote: (payload: LotePayload) =>
    api.post<LoteSerie>("/lotes/", payload).then((response) => response.data),
  actualizarLote: (id: string, payload: Partial<LotePayload>) =>
    api
      .patch<LoteSerie>(`/lotes/${id}/`, payload)
      .then((response) => response.data),
  eliminarLote: (id: string) => api.delete(`/lotes/${id}/`),
};
