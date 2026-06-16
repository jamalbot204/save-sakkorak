import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Tailwind v4 LightningCSS pipeline + PostCSS layer-strip + oklab polyfill.
// @layer properties wrapper is stripped by postcss-strip-layer.cjs.
// oklch() → rgb() by @csstools/postcss-oklab-function.

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2015',
      cssTarget: 'chrome60',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});