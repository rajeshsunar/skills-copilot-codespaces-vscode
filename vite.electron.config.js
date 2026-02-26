import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(process.cwd(), 'electron/main.js'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron', 'node:fs', 'node:path', 'node:url', 'node:crypto'],
    },
  },
});
