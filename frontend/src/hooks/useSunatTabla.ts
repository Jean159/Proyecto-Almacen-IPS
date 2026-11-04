import { useQuery } from "@tanstack/react-query";

import { sunatApi } from "@/api/sunat";
import { queryKeys } from "@/lib/queryKeys";

export function useSunatTabla(tabla: number) {
  return useQuery({
    queryKey: queryKeys.sunat(tabla),
    queryFn: () => sunatApi.tabla(tabla),
    staleTime: 5 * 60_000,
  });
}
