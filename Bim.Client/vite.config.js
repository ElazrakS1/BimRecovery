import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  optimizeDeps: {
    exclude: ['fs', 'fs-extra', 'path', 'graceful-fs']
  },
  build: {
    commonjsOptions: {
      include: [],
      ignore: ['fs', 'path', 'graceful-fs']
    },
    rollupOptions: {
      external: ['fs', 'fs-extra', 'path', 'graceful-fs']
    }
  },
  define: {
    'process.env': {}
  },
  server: {
    middlewares: [
      (req, res, next) => {
        // Security headers
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        
        // Handle WASM and worker files
        if (req.url.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        } else if (req.url.includes('.worker.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }

        next();
      }
    ]
  }
});
