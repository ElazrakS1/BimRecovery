import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function copyWasmFiles() {
  const wasmDir = path.join(rootDir, 'public', 'wasm');
  
  try {
    // Ensure wasm directory exists
    await fs.mkdir(wasmDir, { recursive: true });

    // Source paths
    const webIfcPath = path.join(rootDir, 'node_modules', 'web-ifc');

    // Files to copy
    const files = [
      'web-ifc.wasm',
      'web-ifc-mt.wasm',
      'web-ifc-mt.worker.js'
    ];

    // Copy each file
    for (const file of files) {
      const src = path.join(webIfcPath, file);
      const dest = path.join(wasmDir, file);
      
      try {
        await fs.copyFile(src, dest);
        console.log(`✓ Copied ${file}`);
      } catch (err) {
        console.error(`Error copying ${file}:`, err);
      }
    }

  } catch (err) {
    console.error('Failed to copy WASM files:', err);
    process.exit(1);
  }
}

copyWasmFiles();
