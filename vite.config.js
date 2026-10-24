import { defineConfig } from 'vite';

export default defineConfig({
  base: '/particle-memory-lab/',
  // Three.js alone is ~590 kB minified; that's expected for this lab.
  build: { chunkSizeWarningLimit: 800 },
});
