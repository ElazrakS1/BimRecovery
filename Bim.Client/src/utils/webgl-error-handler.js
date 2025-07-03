/**
 * WebGL Error Handler and Recovery Utilities
 * Handles common WebGL errors and provides recovery mechanisms
 */

import { safeGetErrorMessage, safeGetErrorStack, safeStringIncludes, shouldHandleError } from './error-prevention.js';

/**
 * Common WebGL error messages and their solutions
 */
const WEBGL_ERROR_MESSAGES = {
  CONTEXT_LOST: 'WebGL context was lost. This usually happens due to GPU driver issues or insufficient memory.',
  SHADER_COMPILATION: 'Shader compilation failed. This may be due to incompatible GPU drivers.',
  PROGRAM_LINKING: 'Shader program linking failed. Check for shader compatibility issues.',
  TEXTURE_SIZE: 'Texture size exceeds GPU limits. Try reducing model complexity.',
  MEMORY_LIMIT: 'GPU memory limit exceeded. Try closing other applications or reducing model size.',
  DRIVER_ISSUE: 'GPU driver issue detected. Please update your graphics drivers.'
};

/**
 * Detects the type of WebGL error and provides user-friendly message
 * @param {Error} error - The error object
 * @returns {Object} Error information with type and message
 */
export function analyzeWebGLError(error) {
  // Check if we should handle this error to prevent loops
  if (!shouldHandleError('webgl')) {
    return {
      type: 'THROTTLED',
      userMessage: 'Error handling temporarily disabled to prevent loops',
      suggestions: ['Please refresh the page if issues persist'],
      technicalDetails: 'Error throttled'
    };
  }

  // Safely get error message with null checks
  const errorMessage = safeGetErrorMessage(error);
  const errorLower = errorMessage.toLowerCase();
  
  let errorType = 'UNKNOWN';
  let userMessage = 'An unknown WebGL error occurred.';
  let suggestions = [];
  
  if (safeStringIncludes(errorLower, 'context lost') || safeStringIncludes(errorLower, 'webglcontextlost')) {
    errorType = 'CONTEXT_LOST';
    userMessage = WEBGL_ERROR_MESSAGES.CONTEXT_LOST;
    suggestions = [
      'Refresh the page to restore WebGL context',
      'Close other browser tabs to free up GPU memory',
      'Update your graphics drivers'
    ];
  } else if (errorLower.includes('shader') && errorLower.includes('compile')) {
    errorType = 'SHADER_COMPILATION';
    userMessage = WEBGL_ERROR_MESSAGES.SHADER_COMPILATION;
    suggestions = [
      'Update your graphics drivers',
      'Try using a different browser',
      'Check if your GPU supports WebGL 2.0'
    ];
  } else if (errorLower.includes('program') && errorLower.includes('link')) {
    errorType = 'PROGRAM_LINKING';
    userMessage = WEBGL_ERROR_MESSAGES.PROGRAM_LINKING;
    suggestions = [
      'Update your graphics drivers',
      'Try disabling hardware acceleration in your browser',
      'Use a different browser'
    ];  } else if (errorLower.includes('trim') && errorLower.includes('null')) {
    errorType = 'SHADER_SOURCE_NULL';
    userMessage = 'Shader source code is missing or corrupted. This is usually a library initialization issue.';
    suggestions = [
      'Refresh the page to reload the application',
      'Clear browser cache and reload',
      'Check if all required resources are loaded properly',
      'Try disabling browser extensions that might interfere with WebGL'
    ];
  } else if (errorLower.includes('webglprogram') || errorLower.includes('program')) {
    errorType = 'PROGRAM_CREATION';
    userMessage = 'WebGL program creation failed. This may be due to shader compilation issues.';
    suggestions = [
      'Update your graphics drivers',
      'Try refreshing the page',
      'Check if your browser supports WebGL 2.0',
      'Try using a different browser'
    ];
  } else if (errorLower.includes('texture') || errorLower.includes('image')) {
    errorType = 'TEXTURE_SIZE';
    userMessage = WEBGL_ERROR_MESSAGES.TEXTURE_SIZE;
    suggestions = [
      'Try loading a smaller model',
      'Reduce texture quality in settings',
      'Close other applications to free up GPU memory'
    ];
  } else if (errorLower.includes('memory') || errorLower.includes('out of memory')) {
    errorType = 'MEMORY_LIMIT';
    userMessage = WEBGL_ERROR_MESSAGES.MEMORY_LIMIT;
    suggestions = [
      'Close other browser tabs',
      'Try loading a smaller model',
      'Restart your browser'
    ];
  }
  
  return {
    type: errorType,
    originalError: error,
    userMessage,
    suggestions,
    technicalDetails: errorMessage
  };
}

/**
 * Validates WebGL context and provides detailed information
 * @param {WebGLRenderingContext} gl - WebGL context
 * @returns {Object} Validation results
 */
export function validateWebGLContext(gl) {
  if (!gl) {
    return {
      valid: false,
      error: 'WebGL context is null or undefined'
    };
  }
  
  try {
    // Check if context is lost
    if (gl.isContextLost()) {
      return {
        valid: false,
        error: 'WebGL context is lost'
      };
    }
    
    // Test basic WebGL functionality
    const testShader = gl.createShader(gl.VERTEX_SHADER);
    if (!testShader) {
      return {
        valid: false,
        error: 'Failed to create test shader'
      };
    }
    
    gl.deleteShader(testShader);
    
    return {
      valid: true,
      contextType: gl.constructor.name,
      version: gl.getParameter(gl.VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER)
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Creates a WebGL error recovery plan
 * @param {string} errorType - Type of error detected
 * @returns {Object} Recovery plan with steps
 */
export function createRecoveryPlan(errorType) {
  const plans = {
    CONTEXT_LOST: {
      autoRecovery: true,
      steps: [
        'Wait for context restoration event',
        'Recreate all WebGL resources',
        'Reload the current model'
      ]
    },
    SHADER_COMPILATION: {
      autoRecovery: false,
      steps: [
        'Check GPU driver compatibility',
        'Try fallback shader versions',
        'Reduce shader complexity'
      ]
    },
    SHADER_SOURCE_NULL: {
      autoRecovery: true,
      steps: [
        'Reinitialize shader manager',
        'Reload shader sources',
        'Restart WebGL context'
      ]
    },
    MEMORY_LIMIT: {
      autoRecovery: false,
      steps: [
        'Clear unused resources',
        'Reduce model complexity',
        'Restart application'
      ]
    }
  };
  
  return plans[errorType] || {
    autoRecovery: false,
    steps: ['Restart the application']
  };
}

/**
 * Monitors WebGL context for errors and context loss
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Function} onError - Error callback
 * @param {Function} onRecovery - Recovery callback
 */
export function setupWebGLErrorMonitoring(canvas, onError, onRecovery) {
  if (!canvas) return;
  
  // Context lost handler
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('WebGL context lost');
    
    const errorInfo = analyzeWebGLError(new Error('WebGL context lost'));
    onError(errorInfo);
  });
  
  // Context restored handler
  canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored');
    onRecovery();
  });
  
  // Generic error handler for WebGL errors
  const originalGetContext = canvas.getContext;
  canvas.getContext = function(...args) {
    try {
      const context = originalGetContext.apply(this, args);
      
      if (context && (args[0] === 'webgl' || args[0] === 'webgl2')) {
        // Wrap WebGL methods to catch errors
        const originalGetError = context.getError;
        context.getError = function() {
          const error = originalGetError.call(this);
          if (error !== context.NO_ERROR) {
            console.warn('WebGL error detected:', error);
          }
          return error;
        };
      }
      
      return context;
    } catch (error) {
      const errorInfo = analyzeWebGLError(error);
      onError(errorInfo);
      throw error;
    }
  };
}

/**
 * Safe WebGL operation wrapper
 * @param {Function} operation - WebGL operation to execute
 * @param {string} operationName - Name of the operation for debugging
 * @returns {*} Operation result or null if failed
 */
export function safeWebGLOperation(operation, operationName = 'WebGL operation') {
  try {
    return operation();
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    const errorInfo = analyzeWebGLError(error);
    
    // For critical errors, rethrow
    if (errorInfo.type === 'CONTEXT_LOST' || errorInfo.type === 'SHADER_COMPILATION') {
      throw error;
    }
    
    return null;
  }
}

/**
 * Handles Three.js specific WebGL errors
 * @param {Error} error - The error object
 * @returns {Object} Three.js specific error information
 */
export function analyzeThreeJSError(error) {
  // Check if we should handle this error to prevent loops
  if (!shouldHandleError('threejs')) {
    return {
      type: 'THROTTLED',
      userMessage: 'Three.js error handling temporarily disabled to prevent loops',
      suggestions: ['Please refresh the page if issues persist'],
      recovery: 'MANUAL',
      technicalDetails: 'Error throttled'
    };
  }

  // Safely get error message and stack with null checks
  const errorMessage = safeGetErrorMessage(error);
  const stack = safeGetErrorStack(error);
  
  // Check if this is a Three.js WebGLProgram error
  if (safeStringIncludes(stack, 'WebGLProgram') && safeStringIncludes(errorMessage, 'trim')) {
    return {
      type: 'THREEJS_SHADER_NULL',
      userMessage: 'Three.js shader compilation failed due to missing shader source code.',
      suggestions: [
        'This is likely a timing issue during WebGL initialization',
        'The page will attempt to recover automatically',
        'If the error persists, try refreshing the page',
        'Ensure your browser supports WebGL 2.0'
      ],
      recovery: 'AUTO_RETRY',
      technicalDetails: 'Three.js WebGLProgram constructor received null shader source'
    };
  }
  
  // Check for other Three.js specific errors
  if (safeStringIncludes(stack, 'THREE.') || safeStringIncludes(errorMessage, 'three')) {
    return {
      type: 'THREEJS_GENERAL',
      userMessage: 'Three.js WebGL error occurred.',
      suggestions: [
        'Update your graphics drivers',
        'Try refreshing the page',
        'Check browser WebGL support'
      ],
      recovery: 'MANUAL',
      technicalDetails: errorMessage
    };
  }
  
  return null; // Not a Three.js specific error
}

/**
 * Handles automatic recovery for Three.js shader errors
 * @param {Function} retryCallback - Function to call for retry
 * @param {number} maxRetries - Maximum number of retry attempts
 */
export async function handleThreeJSRecovery(retryCallback, maxRetries = 3) {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
      await retryCallback();
      return true; // Success
    } catch (error) {
      retryCount++;
      console.warn(`Three.js recovery attempt ${retryCount} failed:`, error);
      
      if (retryCount >= maxRetries) {
        console.error('Three.js recovery failed after maximum attempts');
        return false;
      }
    }
  }
  
  return false;
}
