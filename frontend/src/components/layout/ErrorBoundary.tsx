import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de interfaz", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
            <h1 className="text-lg font-bold text-slate-950">Algo salió mal</h1>
            <p className="mt-2 text-sm text-slate-500">
              La pantalla encontró un error inesperado. Recarga para continuar.
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Recargar
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
