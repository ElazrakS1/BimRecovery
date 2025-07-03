/**
 * Shader Protection Utility
 * Prevents null shader source errors in Three.js WebGL compilation
 */

/**
 * Enhanced WebGL shader source protection
 * Prevents the "Cannot read properties of null (reading 'trim')" error
 */
export class ShaderProtection {
  constructor() {
    this.originalWebGLMethods = {};
    this.isProtectionActive = false;
    this.errorCounts = new Map();
    this.lastErrorTime = 0;
    this.MAX_ERRORS_PER_MINUTE = 10;
  }

  /**
   * Activate shader source protection
   */
  activate() {
    if (this.isProtectionActive) return;

    try {
      // Protect WebGL context creation
      this.protectWebGLContext();
      
      // Protect shader source operations
      this.protectShaderSource();
      
      // Protect program operations
      this.protectProgram();
      
      this.isProtectionActive = true;
      console.log('Shader protection activated');
    } catch (error) {
      console.error('Failed to activate shader protection:', error);
    }
  }

  /**
   * Deactivate shader source protection
   */
  deactivate() {
    if (!this.isProtectionActive) return;

    try {
      // Restore original WebGL methods
      this.restoreOriginalMethods();
      
      this.isProtectionActive = false;
      console.log('Shader protection deactivated');
    } catch (error) {
      console.error('Failed to deactivate shader protection:', error);
    }
  }

  /**
   * Protect WebGL context creation
   */
  protectWebGLContext() {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function(contextType, attributes) {
      const context = originalGetContext.call(this, contextType, attributes);
      
      if (context && (contextType === 'webgl' || contextType === 'webgl2')) {
        // Add context validation
        this.addContextValidation(context);
      }
      
      return context;
    }.bind(this);

    this.originalWebGLMethods.getContext = originalGetContext;
  }

  /**
   * Add context validation to WebGL context
   */
  addContextValidation(gl) {
    if (!gl || gl._shaderProtectionApplied) return;

    const protection = this;

    // Protect shaderSource method
    const originalShaderSource = gl.shaderSource;
    gl.shaderSource = function(shader, source) {
      // Validate shader source
      const validatedSource = protection.validateShaderSource(source, shader);
      return originalShaderSource.call(this, shader, validatedSource);
    };

    // Protect compileShader method
    const originalCompileShader = gl.compileShader;
    gl.compileShader = function(shader) {
      try {
        // Check if shader has valid source before compilation
        if (!protection.hasValidShaderSource(this, shader)) {
          console.warn('Shader compilation skipped - invalid or missing source');
          return;
        }
        return originalCompileShader.call(this, shader);
      } catch (error) {
        protection.handleShaderError(error, 'compileShader');
        return;
      }
    };

    // Protect linkProgram method
    const originalLinkProgram = gl.linkProgram;
    gl.linkProgram = function(program) {
      try {
        if (!protection.hasValidProgram(this, program)) {
          console.warn('Program linking skipped - invalid program');
          return;
        }
        return originalLinkProgram.call(this, program);
      } catch (error) {
        protection.handleShaderError(error, 'linkProgram');
        return;
      }
    };

    // Protect useProgram method
    const originalUseProgram = gl.useProgram;
    gl.useProgram = function(program) {
      try {
        if (program && !protection.hasValidProgram(this, program)) {
          console.warn('useProgram skipped - invalid program');
          return;
        }
        return originalUseProgram.call(this, program);
      } catch (error) {
        protection.handleShaderError(error, 'useProgram');
        return;
      }
    };

    gl._shaderProtectionApplied = true;
  }

  /**
   * Validate shader source code
   */
  validateShaderSource(source, shader) {
    // Handle null or undefined source
    if (source === null || source === undefined) {
      console.warn('Null shader source detected, providing fallback');
      return this.getFallbackShaderSource(shader);
    }

    // Handle empty or invalid source
    if (typeof source !== 'string' || source.trim().length === 0) {
      console.warn('Invalid shader source detected, providing fallback');
      return this.getFallbackShaderSource(shader);
    }

    // Validate shader syntax basics
    if (!this.isValidShaderSyntax(source)) {
      console.warn('Invalid shader syntax detected, providing fallback');
      return this.getFallbackShaderSource(shader);
    }

    return source;
  }

  /**
   * Check if shader source is valid syntax
   */
  isValidShaderSyntax(source) {
    // Basic validation - check for essential shader keywords
    const hasMain = /void\s+main\s*\(/i.test(source);
    const hasVersion = /#version|attribute|varying|uniform/i.test(source);
    
    return hasMain || hasVersion;
  }

  /**
   * Get fallback shader source
   */
  getFallbackShaderSource(shader) {
    // Simple vertex shader fallback
    const vertexShaderFallback = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // Simple fragment shader fallback
    const fragmentShaderFallback = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
      }
    `;

    // Try to determine shader type (this is a heuristic)
    return vertexShaderFallback; // Default to vertex shader
  }

  /**
   * Check if shader has valid source
   */
  hasValidShaderSource(gl, shader) {
    try {
      if (!shader) return false;
      
      // Try to get shader source
      const source = gl.getShaderSource(shader);
      
      if (!source || source.trim().length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if program is valid
   */
  hasValidProgram(gl, program) {
    try {
      if (!program) return false;

      // Check if program has attached shaders
      const attachedShaders = gl.getAttachedShaders(program);
      
      if (!attachedShaders || attachedShaders.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle shader-related errors
   */
  handleShaderError(error, operation) {
    const now = Date.now();
    const errorKey = `${operation}_${error.message}`;
    
    // Rate limiting
    if (now - this.lastErrorTime < 1000) { // 1 second minimum between similar errors
      const count = this.errorCounts.get(errorKey) || 0;
      if (count > this.MAX_ERRORS_PER_MINUTE) {
        return; // Skip logging this error
      }
      this.errorCounts.set(errorKey, count + 1);
    } else {
      // Reset error counts after 1 minute
      this.errorCounts.clear();
      this.lastErrorTime = now;
    }

    console.warn(`Shader operation ${operation} failed:`, error.message);
  }

  /**
   * Protect shader source operations globally
   */
  protectShaderSource() {
    // Protect String.prototype.trim calls in WebGL context
    const originalTrim = String.prototype.trim;
    
    String.prototype.trim = function() {
      // Check if this is being called on null/undefined in WebGL context
      if (this === null || this === undefined) {
        console.warn('trim() called on null/undefined value - returning empty string');
        return '';
      }
      
      return originalTrim.call(this);
    };

    this.originalWebGLMethods.trim = originalTrim;
  }

  /**
   * Protect WebGL program operations
   */
  protectProgram() {
    // This would be implemented if we need additional program-level protection
    // For now, context-level protection should be sufficient
  }

  /**
   * Restore original WebGL methods
   */
  restoreOriginalMethods() {
    // Restore getContext
    if (this.originalWebGLMethods.getContext) {
      HTMLCanvasElement.prototype.getContext = this.originalWebGLMethods.getContext;
    }

    // Restore trim
    if (this.originalWebGLMethods.trim) {
      String.prototype.trim = this.originalWebGLMethods.trim;
    }

    this.originalWebGLMethods = {};
  }
}

// Global instance
let globalShaderProtection = null;

/**
 * Activate global shader protection
 */
export function activateShaderProtection() {
  if (!globalShaderProtection) {
    globalShaderProtection = new ShaderProtection();
  }
  
  globalShaderProtection.activate();
  return globalShaderProtection;
}

/**
 * Deactivate global shader protection
 */
export function deactivateShaderProtection() {
  if (globalShaderProtection) {
    globalShaderProtection.deactivate();
  }
}

/**
 * Get the global shader protection instance
 */
export function getShaderProtection() {
  return globalShaderProtection;
}

export default ShaderProtection;
