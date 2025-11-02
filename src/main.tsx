import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppModeProvider } from '@/state/AppModeProvider';
import { I18nProvider } from '@/contexts/I18nContext';
import i18n from '@/i18n/init';
import App from './App.tsx';
import './index.css';

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

function render() {
  const rootEl = document.getElementById('root')!;
  createRoot(rootEl).render(
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
}

// Sicherstellen, dass i18n fertig + Sprache gesetzt ist, dann rendern
if (i18n.isInitialized) {
  // Sprache aufgelöst oder Fallback
  void i18n.changeLanguage(i18n.resolvedLanguage || 'de').finally(render);
} else {
  const initHandler = () => {
    void i18n.changeLanguage(i18n.resolvedLanguage || 'de').finally(render);
  };
  i18n.on('initialized', initHandler);
}
