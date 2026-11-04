import { api, cleanParams } from "@/api/client";
import type { Almacen, ListParams, Paginated, Ubicacion } from "@/types/domain";

export interface AlmacenPayload {
  codigo: string;
  codigo_establecimiento: string;
  codigo_correlativo?: string | null;
  nombre: string;
  direccion: string;
  ubigeo?: string;
  es_almacen_tercero?: boolean;
  activo?: boolean;
}

export interface UbicacionPayload {
  almacen: string;
  codigo: string;
  descripcion?: string;
  capacidad_peso_kg?: string | null;
  capacidad_volumen_m3?: string | null;
  activo?: boolean;
}

export const almacenesApi = {
  list: (params: ListParams = {}) =>
    api
      .get<Paginated<Almacen>>("/almacenes/", {
        params: cleanParams({ page_size: 100, ...params }),
      })
      .then((response) => response.data),
  get: (id: string) =>
    api.get<Almacen>(`/almacenes/${id}/`).then((response) => response.data),
  create: (payload: AlmacenPayload) =>
    api.post<Almacen>("/almacenes/", payload).then((response) => response.data),
  update: (id: string, payload: Partial<AlmacenPayload>) =>
    api
      .patch<Almacen>(`/almacenes/${id}/`, payload)
      .then((response) => response.data),
  remove: (id: string) => api.delete(`/almacenes/${id}/`),
};

export const ubicacionesApi = {
  list: (params: ListParams = {}) =>
    api
      .get<Paginated<Ubicacion>>("/ubicaciones/", {
        params: cleanParams({ page_size: 200, ...params }),
      })
      .then((response) => response.data),
  create: (payload: UbicacionPayload) =>
    api
      .post<Ubicacion>("/ubicaciones/", payload)
      .then((response) => response.data),
  update: (id: string, payload: Partial<UbicacionPayload>) =>
    api
      .patch<Ubicacion>(`/ubicaciones/${id}/`, payload)
      .then((response) => response.data),
  remove: (id: string) => api.delete(`/ubicaciones/${id}/`),
};
