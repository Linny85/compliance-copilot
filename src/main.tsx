import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppModeProvider } from "@/state/AppModeProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import "@/i18n/init";
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

// Debug-Badge: CSS-Klasse setzen bei DEV + localStorage flag
if (import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('debugBadges') === '1') {
  document.documentElement.classList.add('debug-index-badge');
}

createRoot(document.getElementById("root")!).render(
  // StrictMode can be re-enabled later for testing
  // <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AppModeProvider>
          <App />
        </AppModeProvider>
      </I18nProvider>
    </QueryClientProvider>
  // </React.StrictMode>
);
