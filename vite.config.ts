import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    hmr: false,
    ws: false,
    port: 3000,
  }, 
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      'react': path.resolve(process.cwd(), './node_modules/react'),
      'react-dom': path.resolve(process.cwd(), './node_modules/react-dom'),
      'node-domexception': path.resolve(process.cwd(), './src/lib/domexception-shim.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
  },
});
