import "@fontsource-variable/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { App } from "@/App";
import { AuthBootstrap } from "@/components/layout/AuthBootstrap";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AuthBootstrap>
            <App />
          </AuthBootstrap>
        </ErrorBoundary>
        <Toaster richColors position="top-right" closeButton />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
