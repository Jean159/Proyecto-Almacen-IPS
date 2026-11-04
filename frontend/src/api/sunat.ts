import { api } from "@/api/client";
import type { Paginated, SunatTabla } from "@/types/domain";

const cache = new Map<number, Promise<SunatTabla[]>>();

export const sunatApi = {
  tabla: (tabla: number): Promise<SunatTabla[]> => {
    if (!cache.has(tabla)) {
      cache.set(
        tabla,
        api
          .get<Paginated<SunatTabla>>("/sunat/tablas/", {
            params: { tabla_numero: tabla, page_size: 200 },
          })
          .then((response) => response.data.results),
      );
    }
    return cache.get(tabla)!;
  },
};
