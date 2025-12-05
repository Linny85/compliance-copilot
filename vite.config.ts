import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import i18nVerify from "./scripts/vite-i18n-verify-plugin";

const shouldVerify = process.env.I18N_VERIFY === '1';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()];

  if (shouldVerify) {
    plugins.push(
      i18nVerify({
        localesDir: 'public/locales',
        cmd: 'npm run i18n:verify',
        debounceMs: 300,
      })
    );
  }

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        react: path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
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
      esbuildOptions: {
        target: 'es2020',
      },
    },
    build: {
      sourcemap: mode === 'production', // Enable source maps for Sentry
    },
  };
});
