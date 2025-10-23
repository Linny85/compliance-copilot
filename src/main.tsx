import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/init";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

function Root() {
  return (
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </I18nextProvider>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
