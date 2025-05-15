import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function copyFiles() {
  const wasmDir = path.join(projectRoot, 'public', 'wasm');
  
  try {
    // Create wasm directory if it doesn't exist
    await fs.mkdir(wasmDir, { recursive: true });

    // Copy files with executable permissions
    const files = [
      {
        src: 'node_modules/web-ifc/web-ifc.wasm',
        dest: 'web-ifc.wasm'
      },
      {
        src: 'node_modules/web-ifc/web-ifc-mt.wasm',
        dest: 'web-ifc-mt.wasm'
      },
      {
        src: 'node_modules/web-ifc/web-ifc-mt.worker.js',
        dest: 'web-ifc-mt.worker.js'
      }
    ];

    for (const file of files) {
      const srcPath = path.join(projectRoot, file.src);
      const destPath = path.join(wasmDir, file.dest);
      await fs.copyFile(srcPath, destPath);
      // Set read and execute permissions
      await fs.chmod(destPath, 0o755);
    }

    console.log('Files copied successfully with correct permissions!');
  } catch (err) {
    console.error('Error copying files:', err);
    process.exit(1);
  }
}

copyFiles();
