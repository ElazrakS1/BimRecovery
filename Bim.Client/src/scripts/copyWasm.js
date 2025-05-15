import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

const files = [
  {
    src: 'node_modules/web-ifc/web-ifc.wasm',
    dest: 'public/wasm/web-ifc.wasm'
  },
  {
    src: 'node_modules/web-ifc/web-ifc-mt.wasm',
    dest: 'public/wasm/web-ifc-mt.wasm'
  },
  {
    src: 'node_modules/web-ifc/web-ifc-mt.worker.js',
    dest: 'public/wasm/web-ifc-mt.worker.js'
  }
];

async function copyFiles() {
  try {
    // Create wasm directory if it doesn't exist
    await fs.mkdir(path.join(projectRoot, 'public/wasm'), { recursive: true });

    for (const file of files) {
      const srcPath = path.join(projectRoot, file.src);
      const destPath = path.join(projectRoot, file.dest);

      await fs.copyFile(srcPath, destPath);
      console.log(`Copied ${file.src} -> ${file.dest}`);
    }
  } catch (err) {
    console.error('Error copying files:', err);
    process.exit(1);
  }
}

copyFiles();
