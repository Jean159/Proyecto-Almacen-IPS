import { api } from "@/api/client";
import type { DashboardKpis } from "@/types/domain";

export const dashboardApi = {
  kpis: () =>
    api
      .get<DashboardKpis>("/dashboard/kpis/")
      .then((response) => response.data),
};
