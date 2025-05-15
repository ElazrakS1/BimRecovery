import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-worker',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.includes('web-ifc-mt.worker.js')) {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          }
          next();
        });
      }
    }
  ],
  base: '/',
  publicDir: 'public',
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.wasm')) {
            return 'wasm/[name][extname]'  
          }
          if (assetInfo.name.endsWith('.worker.js')) {
            return 'workers/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        format: 'es'
      }
    }
  },
  optimizeDeps: {
    exclude: ['web-ifc'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      'web-ifc': path.resolve(__dirname, 'node_modules/web-ifc'),
      '@wasm': path.resolve(__dirname, 'public/wasm'),
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@context': path.resolve(__dirname, './src/context')
    }
  }
})
