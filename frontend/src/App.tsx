import { Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AlmacenesPage } from "@/features/almacenes/AlmacenesPage";
import { UbicacionesPage } from "@/features/almacenes/UbicacionesPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { SeleccionarEmpresaPage } from "@/features/auth/SeleccionarEmpresaPage";
import { CategoriasPage } from "@/features/catalogo/CategoriasPage";
import { LotesPage } from "@/features/catalogo/LotesPage";
import { ProductoFormPage } from "@/features/catalogo/ProductoFormPage";
import { ProductosPage } from "@/features/catalogo/ProductosPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { KardexPage } from "@/features/kardex/KardexPage";
import { MovimientoDetallePage } from "@/features/movimientos/MovimientoDetallePage";
import { MovimientoWizardPage } from "@/features/movimientos/MovimientoWizardPage";
import { MovimientosPage } from "@/features/movimientos/MovimientosPage";
import { NotFoundPage } from "@/features/NotFoundPage";
import { PeriodosPage } from "@/features/periodos/PeriodosPage";
import { PlePage } from "@/features/ple/PlePage";
import { ReservasPage } from "@/features/stock/ReservasPage";
import { StockPage } from "@/features/stock/StockPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/seleccionar-empresa" element={<SeleccionarEmpresaPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="almacenes" element={<AlmacenesPage />} />
          <Route path="almacenes/ubicaciones" element={<UbicacionesPage />} />
          <Route path="almacenes/:almacenId/ubicaciones" element={<UbicacionesPage />} />
          <Route path="catalogo/productos" element={<ProductosPage />} />
          <Route path="catalogo/productos/nuevo" element={<ProductoFormPage />} />
          <Route path="catalogo/productos/:id" element={<ProductoFormPage />} />
          <Route path="catalogo/categorias" element={<CategoriasPage />} />
          <Route path="catalogo/lotes" element={<LotesPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/reservas" element={<ReservasPage />} />
          <Route path="movimientos" element={<MovimientosPage />} />
          <Route path="movimientos/nuevo" element={<MovimientoWizardPage />} />
          <Route path="movimientos/:id/editar" element={<MovimientoWizardPage />} />
          <Route path="movimientos/:id" element={<MovimientoDetallePage />} />
          <Route path="kardex" element={<KardexPage />} />
          <Route path="ple" element={<PlePage />} />
          <Route path="periodos" element={<PeriodosPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
