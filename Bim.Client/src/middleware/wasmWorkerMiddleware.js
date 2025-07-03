// Combined middleware for serving WASM and Worker files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

export function configureWasmMiddleware(app) {
  // WASM files middleware
  app.get('*.wasm', (req, res) => {
    const wasmPath = path.join(projectRoot, 'public/wasm', path.basename(req.path));
    if (fs.existsSync(wasmPath)) {
      res.set('Content-Type', 'application/wasm');
      res.sendFile(wasmPath);
    } else {
      res.status(404).send('WASM file not found');
    }
  });

  // Worker files middleware
  app.get('*.worker.js', (req, res) => {
    const workerPath = path.join(projectRoot, 'public/wasm', path.basename(req.path));
    if (fs.existsSync(workerPath)) {
      res.set('Content-Type', 'application/javascript');
      res.set('Cross-Origin-Embedder-Policy', 'require-corp');
      res.set('Cross-Origin-Opener-Policy', 'same-origin');
      res.sendFile(workerPath);
    } else {
      res.status(404).send('Worker file not found');
    }
  });

  // Security headers middleware for all requests
  app.use((req, res, next) => {
    res.set({
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'interest-cohort=(), geolocation=(), microphone=(), camera=()'
    });
    next();
  });
}
