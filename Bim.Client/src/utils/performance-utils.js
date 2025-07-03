// Utility functions to prevent error accumulation and improve performance

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Cleanup function for Three.js objects to prevent memory leaks
 * @param {Object} object - Three.js object to cleanup
 */
export function cleanupThreeJSObject(object) {
  if (!object) return;

  // Cleanup geometry
  if (object.geometry) {
    object.geometry.dispose();
  }

  // Cleanup materials
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => {
        cleanupMaterial(material);
      });
    } else {
      cleanupMaterial(object.material);
    }
  }

  // Cleanup children recursively
  if (object.children) {
    [...object.children].forEach(child => {
      cleanupThreeJSObject(child);
      object.remove(child);
    });
  }
}

function cleanupMaterial(material) {
  if (!material) return;

  // Dispose of textures
  const textures = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'alphaMap', 'aoMap'];
  textures.forEach(textureType => {
    if (material[textureType]) {
      material[textureType].dispose();
    }
  });

  // Dispose material itself
  material.dispose();
}

/**
 * Safe error message extraction
 * @param {Error|string|any} error - Error object or message
 * @returns {string} Safe error message
 */
export function getSafeErrorMessage(error) {
  if (!error) return 'Unknown error';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  try {
    return String(error);
  } catch {
    return 'Error occurred but message could not be extracted';
  }
}

/**
 * Check if browser supports required features for IFC viewing
 * @returns {Object} Feature support status
 */
export function checkBrowserCapabilities() {
  return {
    webgl: !!window.WebGLRenderingContext,
    webgl2: !!window.WebGL2RenderingContext,
    webAssembly: typeof WebAssembly === 'object',
    webWorkers: typeof Worker !== 'undefined',
    performanceAPI: 'performance' in window,
    memoryAPI: !!(performance.memory),
    observerAPI: 'PerformanceObserver' in window
  };
}

/**
 * Create a safer WebGL context with error handling
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {WebGLRenderingContext|null} WebGL context or null
 */
export function createSafeWebGLContext(canvas) {
  const contextAttributes = {
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  };

  try {
    const gl = canvas.getContext('webgl2', contextAttributes) || 
               canvas.getContext('webgl', contextAttributes);
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }

    // Add context lost handler
    canvas.addEventListener('webglcontextlost', (e) => {
      console.warn('WebGL context lost');
      e.preventDefault();
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored');
    });

    return gl;
  } catch (error) {
    console.error('Failed to create WebGL context:', error);
    return null;
  }
}

/**
 * Monitor memory usage and provide warnings
 * @returns {Object} Memory usage information
 */
export function getMemoryUsage() {
  if (!performance.memory) {
    return { supported: false };
  }

  const memory = performance.memory;
  return {
    supported: true,
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
    usedMB: (memory.usedJSHeapSize / 1048576).toFixed(2),
    totalMB: (memory.totalJSHeapSize / 1048576).toFixed(2),
    limitMB: (memory.jsHeapSizeLimit / 1048576).toFixed(2),
    percentUsed: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
  };
}
