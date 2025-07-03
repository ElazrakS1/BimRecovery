/**
 * Get the path to a WASM file
 * @param {string} filename - The name of the WASM file
 * @returns {string} The full path to the WASM file
 */
export function getWasmPath(filename) {
    const basePath = '/wasm';
    return filename ? `${basePath}/${filename}` : basePath;
}

/**
 * Check if WASM is supported by the browser
 * @returns {boolean} True if WASM is supported
 */
export function isWasmSupported() {
    try {
        return typeof WebAssembly === 'object' 
            && typeof WebAssembly.instantiate === 'function'
            && typeof WebAssembly.compile === 'function';
    } catch (e) {
        return false;
    }
}

/**
 * Validate that all required WASM files exist
 * @returns {Promise<boolean>} True if all files are accessible
 */
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
