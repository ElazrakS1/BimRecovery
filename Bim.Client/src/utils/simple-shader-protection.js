/**
 * Simplified Shader Protection Utility
 * A safer version that only intercepts console errors without modifying WebGL operations
 */

/**
 * Simple error interceptor for Three.js shader errors
 */
export class SimpleShaderProtection {
  constructor() {
    this.originalConsoleError = console.error;
    this.isActive = false;
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.silentMode = false; // New: silent mode option
  }

  /**
   * Enable silent mode (minimal logging)
   */
  setSilentMode(enabled = true) {
    this.silentMode = enabled;
    if (enabled) {
      console.log('🔇 Silent mode enabled - error suppression will be nearly invisible');
    } else {
      console.log('🔊 Silent mode disabled - normal logging restored');
    }
  }

  /**
   * Activate simple error suppression
   */
  activate() {
    if (this.isActive) return;

    console.log('🛡️ Activating simple shader error suppression...');
    
    // Only intercept console.error to suppress the problematic error
    console.error = (...args) => {
      const errorString = args.join(' ');      // Check for the specific null trim error
      if (errorString.includes('Cannot read properties of null') && 
          errorString.includes('trim')) {
        
        this.errorCount++;
        
        if (!this.silentMode) {
          // Rate limit: only log once every 30 seconds to reduce spam
          const now = Date.now();
          if (now - this.lastErrorTime > 30000) { // 30 seconds
            console.warn('🔇 Suppressing Three.js null shader errors (will show summary every 50 errors)');
            this.lastErrorTime = now;
          }
          
          // Log summary much less frequently - every 50 errors instead of 10
          if (this.errorCount % 50 === 0) {
            console.warn(`📊 Suppressed ${this.errorCount} shader errors total`);
          }
        }
        
        // Don't call original console.error for this specific error
        return;
      }      // Suppress WebGL context lost errors from cascading AND trigger recovery
      if (errorString.includes('WebGL context lost') || 
          errorString.includes('CONTEXT_LOST') ||
          errorString.includes('webglcontextlost')) {
        
        this.errorCount++;
        
        // Rate limit: only log and recover once every 5 seconds for WebGL context errors
        const now = Date.now();
        if (now - this.lastErrorTime > 5000) { // 5 seconds
          if (!this.silentMode) {
            console.warn('🔇 WebGL context loss - triggering recovery (logs reduced to prevent spam)');
          }
          this.lastErrorTime = now;
          
          // Trigger proactive recovery
          this.triggerWebGLRecovery();
        }
        
        return;
      }
      
      // For all other errors, call the original console.error
      return this.originalConsoleError.apply(console, args);
    };

    this.isActive = true;
    console.log('✅ Simple shader protection activated');
  }

  /**
   * Deactivate protection
   */
  deactivate() {
    if (!this.isActive) return;

    console.error = this.originalConsoleError;
    this.isActive = false;
    
    if (this.errorCount > 0) {
      console.log(`🔇 Shader protection deactivated. Suppressed ${this.errorCount} errors total.`);
    } else {
      console.log('🔇 Shader protection deactivated. No errors were suppressed.');
    }
  }
  /**
   * Trigger WebGL recovery
   */
  triggerWebGLRecovery() {
    // Dispatch event to trigger recovery
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webgl-context-lost-detected', {
        detail: {
          source: 'simple-shader-protection',
          timestamp: Date.now()
        }
      }));
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      isActive: this.isActive,
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime
    };
  }
}

// Global instance
let globalSimpleProtection = null;

/**
 * Activate simple shader protection
 */
export function activateSimpleShaderProtection(silentMode = true) {
  if (!globalSimpleProtection) {
    globalSimpleProtection = new SimpleShaderProtection();
  }
  
  globalSimpleProtection.setSilentMode(silentMode);
  globalSimpleProtection.activate();
  return globalSimpleProtection;
}

/**
 * Deactivate simple shader protection
 */
export function deactivateSimpleShaderProtection() {
  if (globalSimpleProtection) {
    globalSimpleProtection.deactivate();
  }
}

/**
 * Get simple protection stats
 */
export function getSimpleProtectionStats() {
  return globalSimpleProtection ? globalSimpleProtection.getStats() : null;
}

/**
 * Enable/disable silent mode for active protection
 */
export function setSimpleProtectionSilentMode(enabled = true) {
  if (globalSimpleProtection) {
    globalSimpleProtection.setSilentMode(enabled);
  } else {
    console.warn('Simple protection not active. Activate it first.');
  }
}

export default SimpleShaderProtection;

// Expose functions globally for console access
if (typeof window !== 'undefined') {
  window.setSimpleProtectionSilentMode = setSimpleProtectionSilentMode;
  window.getSimpleProtectionStats = getSimpleProtectionStats;
  window.activateSimpleShaderProtection = activateSimpleShaderProtection;
  window.deactivateSimpleShaderProtection = deactivateSimpleShaderProtection;
}
