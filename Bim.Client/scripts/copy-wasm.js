import fs from 'fs/promises';
import path from 'path';

const sourceDir = path.resolve('node_modules/web-ifc');
const targetDir = path.resolve('public/wasm');
const files = ['web-ifc.wasm', 'web-ifc-mt.wasm', 'web-ifc-mt.worker.js'];

async function copyWasmFiles() {
  try {
    await fs.mkdir(targetDir, { recursive: true });
    
    for (const file of files) {
      const src = path.join(sourceDir, file);
      const dest = path.join(targetDir, file);
      await fs.copyFile(src, dest);
      console.log(`Copied ${file}`);
    }
  } catch (err) {
    console.error('Failed to copy WASM files:', err);
    process.exit(1);
  }
}

copyWasmFiles();
