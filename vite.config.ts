import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.GOOGLE_SDK_NODE_LOGGING': JSON.stringify('false'),
  },
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
      '../lib/trusted-context.server.js': path.resolve(process.cwd(), './src/lib/trusted-context.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['firebase-admin', 'path', 'fs', 'crypto', 'stream', 'url', 'util', 'assert', 'zlib', 'http', 'https', 'http2', 'net', 'tls', 'dns', 'child_process']
    }
  },
});
