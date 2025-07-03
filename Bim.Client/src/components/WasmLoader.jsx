import { useEffect, useState } from 'react';
import { validateWasmFiles } from '../utils/wasmWorkerUtils';
import { checkWebGLCompatibility } from '../utils/webgl-checker';

export default function WasmLoader({ children, onStatusChange }) {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('checking');

  // Helper function to check if a file exists
  const checkFileExists = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const loadWasm = async () => {
      try {
        setLoadingStatus('checking');
        
        // First check WebGL compatibility
        const webglInfo = checkWebGLCompatibility();
        if (!webglInfo.supported) {
          throw new Error(`WebGL is not supported in your browser. ${webglInfo.error || ''}`);
        }
        
        setLoadingStatus('checking-webgl');
        
        // Check if WebGL has adequate capabilities
        if (webglInfo.maxTextureSize < 2048) {
          throw new Error(`Your graphics card doesn't support large enough textures (${webglInfo.maxTextureSize}px). The application may not render correctly.`);
        }
        
        setLoadingStatus('checking-wasm');
        
        // Use the baseUrl from window.location.origin or current domain
        const baseUrl = window.location.origin;
        
        // Validate all required WASM files
        const validationResult = await validateWasmFiles(baseUrl);
        
        if (!validationResult.allFilesPresent) {
          throw new Error(`Missing required WASM files: ${validationResult.missingFiles.join(', ')}`);
        }
        
        // Check for WebGL shader programs
        setLoadingStatus('checking-shaders');
        
        // Also check if files are available in the /workers/ directory as fallback
        const workersValidation = await Promise.all([
          checkFileExists(`${baseUrl}/workers/web-ifc.wasm`),
          checkFileExists(`${baseUrl}/workers/web-ifc-mt.wasm`),
          checkFileExists(`${baseUrl}/workers/web-ifc-mt.worker.js`)
        ]);
        
        // If files exist in both directories, log a warning
        if (workersValidation.every(exists => exists)) {
          console.warn('WASM files found in both /wasm/ and /workers/ directories. Using files from /wasm/.');
        }

        // All files loaded successfully
        setWasmLoaded(true);
        setError(null);
        setLoadingStatus('ready');
        
        // Notify parent component if callback provided
        if (onStatusChange) {
          onStatusChange({
            loaded: true,
            status: 'ready',
            webglInfo,
            wasmInfo: validationResult
          });
        }
      } catch (error) {
        console.error('Error loading WASM:', error);
        setError(error.message);
        setWasmLoaded(false);
        setLoadingStatus('error');
        
        if (onStatusChange) {
          onStatusChange({ loaded: false, status: 'error', error: error.message });
        }
      }
    };

    loadWasm();
  }, [onStatusChange]);

  if (error) {
    return (
      <div className="wasm-error">
        <h3>Error Loading WebGL/WASM Resources</h3>
        <p>{error}</p>
        <p>Please check that your browser supports WebGL and all required files are present in the /wasm directory.</p>
      </div>
    );
  }
  if (!wasmLoaded) {
    return (
      <div className="wasm-loading">
        <p>Loading WASM files... ({loadingStatus})</p>
      </div>
    );
  }

  return children;
}
