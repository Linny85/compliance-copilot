import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import i18nVerify from "./scripts/vite-i18n-verify-plugin";

// Detect Lovable/Preview environment to avoid sandbox issues
const isLovable =
  process.env.LOVABLE_ENV === '1' ||
  process.env.NODE_ENV === 'preview' ||
  process.env.VERCEL === '1' ||
  false;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    !isLovable && process.env.I18N_VERIFY === '1' && i18nVerify({
      localesDir: 'public/locales',
      cmd: 'npm run i18n:verify',
      debounceMs: 300,
    }),
  ].filter(Boolean) as any[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'i18next',
      'react-i18next',
      'zustand',
    ],
  },
  build: {
    sourcemap: mode === 'production', // Enable source maps for Sentry
  },
}));
