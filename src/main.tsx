import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import I18nSafeProvider from "@/providers/I18nSafeProvider";
import { AppModeProvider } from "@/state/AppModeProvider";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

function Root() {
  return (
    <React.StrictMode>
      <AppModeProvider>
        <I18nSafeProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </I18nSafeProvider>
      </AppModeProvider>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
