import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { solemnShareApiPlugin } from './scripts/vite-share-api-plugin.mts';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), solemnShareApiPlugin(root)],
  server: {
    port: 3001,
    host: true,
  },
  preview: {
    port: 3001,
    host: true,
  },
});
