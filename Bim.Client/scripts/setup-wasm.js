import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function setupWasm() {
  try {
    // Create directories
    await fs.mkdir(path.join(rootDir, 'public/wasm'), { recursive: true })
    await fs.mkdir(path.join(rootDir, 'public/workers'), { recursive: true })

    // Copy WASM files
    await fs.copyFile(
      path.join(rootDir, 'node_modules/web-ifc/web-ifc.wasm'),
      path.join(rootDir, 'public/wasm/web-ifc.wasm')
    )
    
    await fs.copyFile(
      path.join(rootDir, 'node_modules/web-ifc/web-ifc-mt.wasm'),
      path.join(rootDir, 'public/wasm/web-ifc-mt.wasm') 
    )

    // Copy worker file
    const workerContent = await fs.readFile(
      path.join(rootDir, 'node_modules/web-ifc/web-ifc-mt.worker.js'),
      'utf8'
    )

    await fs.writeFile(
      path.join(rootDir, 'public/workers/web-ifc-mt.worker.js'),
      workerContent
    )

    console.log('WASM setup complete!')
  } catch (err) {
    console.error('Error setting up WASM:', err)
    process.exit(1)
  }
}

setupWasm()
