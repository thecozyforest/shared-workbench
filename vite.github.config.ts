import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'github',
  base: './',
  publicDir: path.resolve(import.meta.dirname, 'public'),
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
    },
  },
  build: {
    outDir: '../github-pages',
    emptyOutDir: true,
  },
});
