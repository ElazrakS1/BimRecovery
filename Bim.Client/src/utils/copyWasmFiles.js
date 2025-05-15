import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyFiles() {
  const wasmDir = path.resolve(__dirname, '../../public/wasm');
  const webIfcPath = path.resolve(__dirname, '../../node_modules/web-ifc');
  
  try {
    // Ensure wasm directory exists
    await fs.mkdir(wasmDir, { recursive: true });

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
        // Set file permissions to ensure they're readable
        await fs.chmod(dest, 0o644);
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

copyFiles();
