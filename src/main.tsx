import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppModeProvider } from "@/state/AppModeProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { initSentry } from "@/lib/sentry";
import "@/i18n/init";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry early
initSentry();

// DEV: Verify single React instance
if (import.meta.env.DEV) {
  import('react').then(r => {
    import('react-dom').then(rd => {
      console.info('[react]', r.version, '[react-dom]', rd.version);
    });
  });
}

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

// DEV: Mount DevOverlay (only visible with ?dev=1)
if (import.meta.env.DEV) {
  import('./dev/DevOverlay').then(({ default: DevOverlay }) => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    import('react-dom/client').then(({ createRoot }) => {
      createRoot(root).render(<DevOverlay />);
    });
  });
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
