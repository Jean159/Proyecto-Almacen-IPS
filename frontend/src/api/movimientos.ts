import { api, cleanParams } from "@/api/client";
import type {
  EventoMovimiento,
  ListParams,
  Movimiento,
  MovimientoListItem,
  MovimientoPayload,
  Paginated,
} from "@/types/domain";

export const movimientosApi = {
  list: (params: ListParams = {}) =>
    api
      .get<Paginated<MovimientoListItem>>("/movimientos/", {
        params: cleanParams({ page_size: 50, ...params }),
      })
      .then((response) => response.data),
  get: (id: string) =>
    api
      .get<Movimiento>(`/movimientos/${id}/`)
      .then((response) => response.data),
  create: (payload: MovimientoPayload) =>
    api
      .post<Movimiento>("/movimientos/", payload)
      .then((response) => response.data),
  update: (id: string, payload: Partial<MovimientoPayload>) =>
    api
      .patch<Movimiento>(`/movimientos/${id}/`, payload)
      .then((response) => response.data),
  remove: (id: string) => api.delete(`/movimientos/${id}/`),
  confirmar: (id: string, idempotencyKey: string) =>
    api
      .post<Movimiento>(
        `/movimientos/${id}/confirmar/`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      )
      .then((response) => response.data),
  anular: (id: string) =>
    api
      .post<Movimiento>(`/movimientos/${id}/anular/`)
      .then((response) => response.data),
  eventos: (id: string) =>
    api
      .get<EventoMovimiento[]>(`/movimientos/${id}/eventos/`)
      .then((response) => response.data),
};
