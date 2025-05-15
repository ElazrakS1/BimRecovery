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
    const workerPath = path.join(projectRoot, 'node_modules/web-ifc', path.basename(req.path));
    if (fs.existsSync(workerPath)) {
      res.set('Content-Type', 'application/javascript');
      res.sendFile(workerPath);
    } else {
      res.status(404).send('Worker file not found');
    }
  });
}
