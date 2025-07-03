// Combined utilities for WASM and Web Workers

// Constants for worker paths
export const WORKER_PATHS = {
  IFC_WORKER: '/wasm/web-ifc-mt.worker.js'
};

// Check if Web Workers are supported in the current environment
export function isWorkerSupported() {
  return typeof Worker !== 'undefined';
}

// Worker utilities
export function createWebWorker(scriptPath) {
  if (!isWorkerSupported()) {
    throw new Error('Web Workers are not supported in this environment');
  }

  try {
    return new Worker(scriptPath, { type: 'module' });
  } catch (error) {
    console.error('Error creating Web Worker:', error);
    throw error;
  }
}

// Terminate a worker safely
export function terminateWorker(worker) {
  if (worker && typeof worker.terminate === 'function') {
    worker.terminate();
  }
}

// Post a message to a worker with error handling
export async function postWorkerMessage(worker, message) {
  if (!worker) {
    throw new Error('Worker is not initialized');
  }

  try {
    worker.postMessage(message);
    return true;
  } catch (error) {
    console.error('Error posting message to worker:', error);
    return false;
  }
}

// Helper function to create a promise that resolves when the worker sends a specific message
export function waitForWorkerMessage(worker, messageType) {
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      if (event.data.type === messageType) {
        worker.removeEventListener('message', handler);
        resolve(event.data);
      }
    };
    worker.addEventListener('message', handler);
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      worker.removeEventListener('message', handler);
      reject(new Error(`Timeout waiting for worker message: ${messageType}`));
    }, 30000); // 30 second timeout
  });
}
