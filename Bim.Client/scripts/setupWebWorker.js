import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function copyWorkerFiles() {
  const wasmDir = path.join(projectRoot, 'public', 'wasm');
  const workerSrc = path.join(projectRoot, 'node_modules', 'web-ifc', 'web-ifc-mt.worker.js');
  const workerDest = path.join(wasmDir, 'web-ifc-mt.worker.js');

  try {
    await fs.mkdir(wasmDir, { recursive: true });
    await fs.copyFile(workerSrc, workerDest);
    console.log('✓ Copied web worker file');
  } catch (err) {
    console.error('Error copying worker file:', err);
    process.exit(1);
  }
}

copyWorkerFiles();
