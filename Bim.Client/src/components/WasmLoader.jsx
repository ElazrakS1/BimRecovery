import { useEffect, useState } from 'react';

export default function WasmLoader({ children }) {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWasm = async () => {
      try {
        // Check all required WASM files
        const requiredFiles = [
          '/wasm/web-ifc.wasm',
          '/wasm/web-ifc-mt.wasm'
        ];

        const results = await Promise.all(
          requiredFiles.map(async (file) => {
            const response = await fetch(file);
            if (!response.ok) {
              throw new Error(`Failed to load ${file}`);
            }
            return response;
          })
        );

        // Check if web worker is available
        const workerResponse = await fetch('/wasm/web-ifc-mt.worker.js');
        if (!workerResponse.ok) {
          throw new Error('Failed to load web worker');
        }

        // All files loaded successfully
        setWasmLoaded(true);
        setError(null);
      } catch (error) {
        console.error('Error loading WASM:', error);
        setError(error.message);
        setWasmLoaded(false);
      }
    };

    loadWasm();
  }, []);

  if (error) {
    return (
      <div className="wasm-error">
        <h3>Error loading WASM files</h3>
        <p>{error}</p>
        <p>Please check that all required files are present in the /wasm directory.</p>
      </div>
    );
  }

  if (!wasmLoaded) {
    return (
      <div className="wasm-loading">
        <p>Loading WASM files...</p>
      </div>
    );
  }

  return children;
}
