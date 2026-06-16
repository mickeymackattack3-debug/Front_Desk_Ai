import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/widget.js',
      name: 'FrontDeskAI',
      formats: ['iife'],
      fileName: () => 'widget.js'
    },
    rollupOptions: {
      output: {
        // Minify but keep readable enough for debugging
        compact: true
      }
    },
    // Don't copy public assets
    copyPublicDir: false
  }
});