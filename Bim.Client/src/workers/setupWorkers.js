import fs from 'fs/promises';
import path from 'path';

const workerFiles = [
  {
    src: path.resolve('node_modules/web-ifc/web-ifc-mt.worker.js'),
    dest: path.resolve('public/workers/web-ifc-mt.worker.js')
  },
  {
    src: path.resolve('node_modules/web-ifc/web-ifc.wasm'),
    dest: path.resolve('public/workers/web-ifc.wasm')
  },
  {
    src: path.resolve('node_modules/web-ifc/web-ifc-mt.wasm'),
    dest: path.resolve('public/workers/web-ifc-mt.wasm') 
  }
];

async function copyWorkerFiles() {
  try {
    await fs.mkdir('public/workers', { recursive: true });
    
    for (const file of workerFiles) {
      await fs.copyFile(file.src, file.dest);
      console.log(`Copied ${path.basename(file.src)}`);
    }
  } catch (err) {
    console.error('Error copying worker files:', err);
    process.exit(1);
  }
}

copyWorkerFiles();
