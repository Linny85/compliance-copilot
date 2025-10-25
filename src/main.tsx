import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import I18nSafeProvider from "@/providers/I18nSafeProvider";
import { AppModeProvider } from "@/state/AppModeProvider";
import App from "./App.tsx";
import "./index.css";
import { i18nReady } from "@/i18n/init";

const queryClient = new QueryClient();

function Root() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nSafeProvider>
          <AppModeProvider>
            <App />
          </AppModeProvider>
        </I18nSafeProvider>
      </QueryClientProvider>
    </React.StrictMode>
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
