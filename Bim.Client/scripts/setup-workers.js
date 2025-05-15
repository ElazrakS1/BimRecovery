import fs from 'fs/promises'
import path from 'path'

const FILES_TO_COPY = [
  {
    src: 'node_modules/web-ifc/web-ifc-mt.worker.js',
    dest: 'public/workers/web-ifc-mt.worker.js'
  },
  {
    src: 'node_modules/web-ifc/web-ifc.wasm',
    dest: 'public/workers/web-ifc.wasm'
  },
  {
    src: 'node_modules/web-ifc/web-ifc-mt.wasm',
    dest: 'public/workers/web-ifc-mt.wasm'
  }
]

async function copyFiles() {
  try {
    await fs.mkdir('public/workers', { recursive: true })
    
    for (const file of FILES_TO_COPY) {
      await fs.copyFile(
        path.resolve(file.src),
        path.resolve(file.dest)
      )
      console.log(`Copied ${file.src} to ${file.dest}`)
    }
  } catch (err) {
    console.error('Error copying files:', err)
    process.exit(1)
  }
}

copyFiles()
