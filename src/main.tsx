import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/contexts/I18nContext";
import { AppModeProvider } from "@/state/AppModeProvider";
import App from "./App.tsx";
import "./index.css";
import { i18nReady } from "@/i18n/init";

const queryClient = new QueryClient();

function Root() {
  return (
    
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AppModeProvider>
            <App />
          </AppModeProvider>
        </I18nProvider>
      </QueryClientProvider>
    
  );
}

const root = document.getElementById("root")!;

i18nReady.then(() => {
  createRoot(root).render(<Root />);
});

// Vite HMR: prevent re-init on hot reload
if (import.meta.hot) {
  import.meta.hot.accept();
}
