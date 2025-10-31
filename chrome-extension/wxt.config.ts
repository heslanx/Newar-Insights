import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  entrypointsDir: path.resolve(__dirname, 'entrypoints'),
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Otimizações de performance
      minify: true,
      // Chunk size warnings
      chunkSizeWarningLimit: 500,
    },
  }),
  manifest: {
    name: 'Newar Insights Recorder',
    description: 'Grave suas reuniões do Google Meet automaticamente com um clique',
    version: '1.0.0',
    permissions: ['storage', 'notifications', 'alarms', 'tabs', 'contextMenus'],
    host_permissions: ['https://meet.google.com/*'],
    commands: {
      'toggle-recording': {
        suggested_key: {
          default: 'Alt+Shift+R',
          mac: 'Alt+Shift+R',
        },
        description: 'Iniciar/parar gravação',
      },
      'open-recordings': {
        suggested_key: {
          default: 'Alt+Shift+O',
          mac: 'Alt+Shift+O',
        },
        description: 'Abrir gravações',
      },
    },
  },
});
