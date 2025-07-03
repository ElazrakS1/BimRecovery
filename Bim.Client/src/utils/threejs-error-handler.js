/**
 * Three.js WebGL Error Handler
 * Specialized error handling for Three.js WebGL shader compilation issues
 */

/**
 * Enhanced Three.js error interceptor
 * Catches shader compilation errors before they become fatal
 */
export class ThreeJSErrorInterceptor {
  constructor() {
    this.originalConsoleError = console.error;
    this.errorBuffer = [];
    this.onError = null;
    this.isActive = false;
    this.shaderErrors = [];
    this.webglLostContext = false;
  }

  /**
   * Activate the error interceptor
   * @param {Function} onError - Callback function for when errors are detected
   */
  activate(onError) {
    if (this.isActive) return;
    
    this.onError = onError;
    this.isActive = true;
      console.error = (...args) => {
      const errorString = args.join(' ');
      
      // Check for the specific null trim error that causes infinite loops
      if (errorString.includes('Cannot read properties of null') && errorString.includes('trim')) {
        // Silently suppress this error to prevent infinite loops
        console.warn('Null shader source error suppressed to prevent infinite loop');
        return;
      }
      
      // Check for Three.js WebGL shader errors
      if (this.isShaderError(errorString)) {
        this.shaderErrors.push({
          message: errorString,
          timestamp: Date.now(),
          args: args
        });
        
        this.handleShaderError(errorString);
        return; // Don't propagate shader errors to avoid spam
      }
      
      // Check for WebGL context lost
      if (this.isWebGLContextLostError(errorString)) {
        this.webglLostContext = true;
        this.handleContextLost();
        return;
      }
      if (this.isThreeJSWebGLError(errorString)) {
        console.warn('Three.js WebGL error intercepted:', errorString);
        this.errorBuffer.push({
          message: errorString,
          timestamp: Date.now(),
          args: args
        });
        
        // If we have multiple shader errors quickly, trigger recovery
        if (this.shouldTriggerRecovery()) {
          this.triggerRecovery(errorString);
        }
        
        // Don't show shader errors in console to avoid user confusion
        return;
      }
      
      // Pass through other errors normally
      this.originalConsoleError.apply(console, args);
    };
  }

  /**
   * Deactivate the error interceptor
   */
  deactivate() {
    if (!this.isActive) return;
    
    console.error = this.originalConsoleError;
    this.isActive = false;
    this.errorBuffer = [];
  }  /**
   * Check if an error is a shader compilation error
   * @param {string} errorString - Error message to check
   * @returns {boolean} True if it's a shader error
   */
  isShaderError(errorString) {
    const shaderPatterns = [
      'shader compilation failed',
      'program linking failed',
      'WebGLProgram',
      'WebGLShader',
      'THREE.WebGLProgram',
      'THREE.WebGLShader',
      'VALIDATE_STATUS',
      'fragment shader',
      'vertex shader',
      'missing shader source',
      'shader source code',
      'Cannot read properties of null (reading \'trim\')',
      'Cannot read property \'trim\' of null',
      'trim of null',
      'trim of undefined'
    ];
    
    return shaderPatterns.some(pattern =>
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error indicates WebGL context lost
   * @param {string} errorString - Error message to check
   * @returns {boolean} True if context is lost
   */
  isWebGLContextLostError(errorString) {
    const contextLostPatterns = [
      'webgl context lost',
      'context lost',
      'CONTEXT_LOST_WEBGL',
      'webglcontextlost'
    ];
    
    return contextLostPatterns.some(pattern =>
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Handle shader compilation errors
   * @param {string} errorString - Shader error message
   */
  handleShaderError(errorString) {
    console.warn('Three.js shader compilation issue detected:', errorString);
    console.warn('Suggestions:');
    console.warn('- This is likely a timing issue during WebGL initialization');
    console.warn('- The page will attempt to recover automatically');
    console.warn('- If the error persists, try refreshing the page');
    console.warn('- Ensure your browser supports WebGL 2.0');
    
    if (this.onError) {
      this.onError({
        type: 'shader',
        message: errorString,
        recoverable: true,
        suggestion: 'Three.js shader compilation failed due to missing shader source code.'
      });
    }
  }

  /**
   * Handle WebGL context lost
   */
  handleContextLost() {
    console.warn('WebGL context lost - attempting recovery');
    
    if (this.onError) {
      this.onError({
        type: 'context_lost',
        message: 'WebGL context was lost',
        recoverable: true,
        suggestion: 'WebGL context lost - reinitializing viewer'
      });
    }
  }

  /**
   * Check if an error message is a Three.js WebGL error
   * @param {string} errorString - Error message to check
   * @returns {boolean} True if it's a Three.js WebGL error
   */
  isThreeJSWebGLError(errorString) {
    const patterns = [
      'WebGLProgram',
      'Cannot read properties of null',
      'Cannot read property \'trim\' of null',
      'THREE.WebGLProgram',
      'WebGLShader',
      'shader compilation failed',
      'program linking failed',
      'THREE.WebGLShader'
    ];
    
    return patterns.some(pattern =>
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Determine if recovery should be triggered
   * @returns {boolean} True if recovery should be triggered
   */
  shouldTriggerRecovery() {
    const now = Date.now();
    
    // Remove old errors (older than 5 seconds)
    this.errorBuffer = this.errorBuffer.filter(
      error => now - error.timestamp < 5000
    );
    
    // Trigger recovery if we have multiple errors in quick succession
    return this.errorBuffer.length >= 2;
  }

  /**
   * Trigger recovery mechanism
   * @param {string} errorString - The error that triggered recovery
   */
  triggerRecovery(errorString) {
    if (!this.onError) return;
    
    console.log('Multiple Three.js WebGL errors detected, triggering recovery...');
    
    // Create a synthetic error for the recovery system
    const error = new Error('Three.js shader compilation failed: ' + errorString);
    error.stack = 'WebGLProgram\n' + (new Error().stack);
    
    // Trigger recovery with a small delay to allow current operation to complete
    setTimeout(() => {
      this.onError(error);
    }, 100);
  }

  /**
   * Get current error buffer
   * @returns {Array} Array of intercepted errors
   */
  getErrorBuffer() {
    return [...this.errorBuffer];
  }
}

/**
 * Enhanced Three.js error analysis
 * @param {Error} error - The error object
 * @returns {Object} Detailed error analysis
 */
export function analyzeThreeJSWebGLError(error) {
  const errorMessage = error.message || error.toString();
  const stack = error.stack || '';
  
  // Check for specific Three.js WebGL errors
  if (stack.includes('WebGLProgram') || errorMessage.includes('trim')) {
    return {
      type: 'THREEJS_SHADER_COMPILATION',
      severity: 'HIGH',
      userMessage: 'Three.js shader compilation failed due to missing shader source code.',
      technicalMessage: 'WebGL shader compilation failed - likely timing issue during initialization',
      suggestions: [
        'This is a timing issue during WebGL initialization',
        'The application will attempt automatic recovery',
        'If the error persists, try refreshing the page',
        'Ensure your browser supports WebGL 2.0',
        'Check that your GPU drivers are up to date'
      ],
      recovery: {
        type: 'AUTO_RETRY',
        maxAttempts: 3,
        delays: [1000, 2000, 5000] // Progressive delays
      },
      diagnostics: {
        webglSupported: !!window.WebGLRenderingContext,
        webgl2Supported: !!window.WebGL2RenderingContext,
        hardwareAcceleration: this.checkHardwareAcceleration()
      }
    };
  }
  
  // Check for other Three.js errors
  if (stack.includes('THREE.') || errorMessage.includes('three')) {
    return {
      type: 'THREEJS_GENERAL',
      severity: 'MEDIUM',
      userMessage: 'Three.js WebGL error occurred.',
      technicalMessage: 'General Three.js error',
      suggestions: [
        'Update your graphics drivers',
        'Try refreshing the page',
        'Check browser WebGL support',
        'Try using a different browser'
      ],
      recovery: {
        type: 'MANUAL',
        maxAttempts: 1
      }
    };
  }
  
  return null; // Not a Three.js specific error
}

/**
 * Create a recovery plan for Three.js errors
 * @param {Object} errorAnalysis - Result from analyzeThreeJSWebGLError
 * @returns {Object} Recovery plan
 */
export function createThreeJSRecoveryPlan(errorAnalysis) {
  if (!errorAnalysis || !errorAnalysis.recovery) {
    return {
      canRecover: false,
      plan: []
    };
  }
  
  const { recovery } = errorAnalysis;
  
  const plans = {
    AUTO_RETRY: {
      canRecover: true,
      plan: [
        'Clear WebGL context',
        'Wait for GPU to stabilize',
        'Reinitialize Three.js renderer',
        'Retry shader compilation',
        'Validate WebGL functionality'
      ]
    },
    MANUAL: {
      canRecover: false,
      plan: [
        'Display error message to user',
        'Provide troubleshooting steps',
        'Offer page refresh option'
      ]
    }
  };
  
  return plans[recovery.type] || plans.MANUAL;
}

export default ThreeJSErrorInterceptor;
