// Get the path to the WASM files
export function getWasmPath(filename) {
    // In development and production, WASM files are served from /wasm
    const basePath = '/wasm';
    return filename ? `${basePath}/${filename}` : basePath;
}

// Validate that all required WASM files exist
export async function validateWasmFiles() {
    const requiredFiles = [
        'web-ifc.wasm',
        'web-ifc-mt.wasm',
        'web-ifc-mt.worker.js'
    ];

    try {
        const promises = requiredFiles.map(async file => {
            const response = await fetch(getWasmPath(file));
            if (!response.ok) {
                throw new Error(`Failed to load ${file}`);
            }
            return true;
        });

        await Promise.all(promises);
        return true;
    } catch (error) {
        console.error('WASM file validation failed:', error);
        return false;
    }
}