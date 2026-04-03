import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Make renderer/ the Vite root so HTML files output to the top of outDir
  root: path.resolve(__dirname),

  // CRITICAL: relative asset paths so Electron's file:// protocol resolves them
  base: './',

  build: {
    outDir: path.resolve(__dirname, '../ui'),
    emptyOutDir: false,   // preserve overlay.html written by step 4
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        picker: path.resolve(__dirname, 'picker.html'),
      },
    },
  },

  resolve: {
    alias: {
      // Let the renderer import shared types without a separate build step
      '@glance/shared': path.resolve(__dirname, '../../shared/src/index.ts'),
    },
  },
});
