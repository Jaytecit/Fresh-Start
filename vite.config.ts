import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { solemnShareApiPlugin } from './scripts/vite-share-api-plugin.mts';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative paths so itch.io (and other zip hosts) can serve from any folder.
  base: './',
  plugins: [react(), solemnShareApiPlugin(root)],
  build: {
    // Emit every asset as a real file (no base64 inlining) so itch zips
    // contain the full body-part / media set next to the JS bundle.
    assetsInlineLimit: 0,
  },
  server: {
    port: 3001,
    host: true,
  },
  preview: {
    port: 3001,
    host: true,
  },
});
