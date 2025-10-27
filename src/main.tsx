import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppModeProvider } from "@/state/AppModeProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import "@/lib/i18n";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: 5 * 60_000,
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AppModeProvider>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </AppModeProvider>
    </I18nProvider>
  </QueryClientProvider>
);
