import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.GOOGLE_SDK_NODE_LOGGING': JSON.stringify('false'),
    'process.argv': JSON.stringify([]),
    'process.platform': JSON.stringify('browser'),
    'global': 'globalThis',
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
  optimizeDeps: {
    exclude: [
      'firebase-admin',
      '@google-cloud/firestore',
      '@google-cloud/storage',
      'google-auth-library',
      'google-logging-utils',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      'react': path.resolve(process.cwd(), './node_modules/react'),
      'react-dom': path.resolve(process.cwd(), './node_modules/react-dom'),
      'node-domexception': path.resolve(process.cwd(), './src/lib/domexception-shim.ts'),
      '../lib/trusted-context.server.js': path.resolve(process.cwd(), './src/lib/trusted-context.ts'),
      'firebase-admin/app': path.resolve(process.cwd(), './src/lib/server-mock.ts'),
      'firebase-admin/firestore': path.resolve(process.cwd(), './src/lib/server-mock.ts'),
      'firebase-admin/auth': path.resolve(process.cwd(), './src/lib/server-mock.ts'),
      'firebase-admin/storage': path.resolve(process.cwd(), './src/lib/server-mock.ts'),
      'firebase-admin': path.resolve(process.cwd(), './src/lib/server-mock.ts'),
      'google-logging-utils': path.resolve(process.cwd(), './src/lib/google-logging-utils-mock.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
  },
});
