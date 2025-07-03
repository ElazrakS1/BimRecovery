import express from 'express';
import { createServer } from 'vite';
import { configureWasmMiddleware } from './src/middleware/wasmWorkerMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createDevServer() {
  const app = express();

  // Configure WASM and Worker middleware
  configureWasmMiddleware(app);

  // Initialize Vite in middleware mode
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Use Vite's middleware after custom middleware
  app.use(vite.middlewares);

  return { app, vite };
}

createDevServer().then(({ app }) => {
  app.listen(5173, () => {
    console.log('Server running at http://localhost:5173');
  });
});
