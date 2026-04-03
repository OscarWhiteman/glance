import { defineConfig } from 'vite';
import path from 'path';

const entries = {
  background: { entry: 'src/background.ts', globalName: 'GlanceBackground' },
  content:    { entry: 'src/content.ts',    globalName: 'GlanceContent' },
} as const;

const target = (process.env.BUILD_TARGET ?? 'background') as keyof typeof entries;
const { entry, globalName } = entries[target];

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, entry),
      formats: ['iife'],
      name: globalName,
      fileName: () => `${target}.js`,
    },
    outDir: 'dist',
    emptyOutDir: target === 'background',  // only wipe on first build
    minify: false,
  },
});
