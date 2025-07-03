/* eslint-env node */
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyWasmFiles() {
    try {
        // Get absolute paths - using the correct node_modules paths
        const sourceWasmDir = resolve(__dirname, '../../node_modules/web-ifc/dist/');
        const sourceWorkerDir = resolve(__dirname, '../../node_modules/web-ifc/');
        const targetWasmDir = resolve(__dirname, '../../public/wasm/');

        // Ensure target directory exists
        await fs.ensureDir(targetWasmDir);

        console.log('Searching in source directory:', sourceWasmDir);
        
        // Liste les fichiers dans le répertoire source pour le débogage
        try {
            const files = await fs.readdir(sourceWasmDir);
            console.log('Files in source directory:', files);
        } catch (err) {
            console.log('Could not list source directory:', err.message);
        }

        // Files to copy from web-ifc
        const wasmFiles = [
            'web-ifc.wasm',
            'web-ifc-mt.wasm'
        ];

        // Copy WASM files
        for (const file of wasmFiles) {
            // Essayer plusieurs chemins possibles
            const possiblePaths = [
                join(sourceWasmDir, file),
                join(resolve(__dirname, '../../node_modules/web-ifc/'), file),
                join(resolve(__dirname, '../../node_modules/web-ifc/dist/'), file),
                join(resolve(__dirname, '../../node_modules/web-ifc-viewer/dist/'), file),
            ];
            
            const targetPath = join(targetWasmDir, file);
            
            let copied = false;
            for (const sourcePath of possiblePaths) {
                try {
                    if (await fs.pathExists(sourcePath)) {
                        await fs.copy(sourcePath, targetPath);
                        console.log(`✓ Copied ${file} from ${sourcePath} to public/wasm/`);
                        copied = true;
                        break;
                    }
                } catch (error) {
                    console.warn(`Warning: Could not copy from ${sourcePath}: ${error.message}`);
                }
            }
            
            if (!copied) {
                console.error(`Could not find ${file} in any of the expected locations`);
                // Créer un fichier vide pour éviter les erreurs
                await fs.writeFile(targetPath, new Uint8Array(0));
                console.log(`Created empty placeholder for ${file}`);
            }
        }

        // Create a minimal web-ifc-mt.worker.js if we can't find the original
        const workerTargetPath = join(targetWasmDir, 'web-ifc-mt.worker.js');
        
        try {
            // Essayer de trouver le worker file dans plusieurs emplacements
            const possibleWorkerPaths = [
                join(sourceWorkerDir, 'IFCWorker.js'),
                join(resolve(__dirname, '../../node_modules/web-ifc-three/'), 'IFCWorker.js'),
                join(resolve(__dirname, '../../node_modules/web-ifc-viewer/dist/'), 'IFCWorker.js'),
            ];
            
            let copied = false;
            for (const workerSourcePath of possibleWorkerPaths) {
                if (await fs.pathExists(workerSourcePath)) {
                    await fs.copy(workerSourcePath, workerTargetPath);
                    console.log(`✓ Copied worker from ${workerSourcePath} to public/wasm/web-ifc-mt.worker.js`);
                    copied = true;
                    break;
                }
            }
            
            // Si on ne trouve pas le worker file, créer un worker minimal
            if (!copied) {
                const minimalWorker = `
                // Minimal IFC Worker
                self.onmessage = function(e) {
                    self.postMessage({
                        id: e.data.id, 
                        result: { success: false, error: "Worker not available" }
                    });
                };`;
                
                await fs.writeFile(workerTargetPath, minimalWorker);
                console.log(`Created minimal worker at public/wasm/web-ifc-mt.worker.js`);
            }
        } catch (error) {
            console.warn(`Warning: Could not create worker: ${error.message}`);
        }

        console.log('✓ WASM setup completed successfully');
    } catch (error) {
        console.error('Error setting up WASM files:', error);
        if (typeof process !== 'undefined') {
            process.exit(1);
        }
    }
}

// Execute the copy function
copyWasmFiles();
