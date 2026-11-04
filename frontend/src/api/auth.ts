import { api } from "@/api/client";
import type {
  Empresa,
  LoginResponse,
  MeResponse,
  Paginated,
} from "@/types/domain";

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<LoginResponse>("/auth/login/", { email, password })
      .then((response) => response.data),
  me: () => api.get<MeResponse>("/auth/me/").then((response) => response.data),
  empresas: () =>
    api
      .get<Paginated<Empresa>>("/empresas/", { params: { page_size: 100 } })
      .then((response) => response.data),
};
