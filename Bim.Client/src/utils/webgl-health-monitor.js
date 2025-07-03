/**
 * Enhanced WebGL Error Prevention and Recovery System
 * Provides proactive error detection and automatic recovery mechanisms
 */

/**
 * WebGL Health Monitor - tracks WebGL context health and performance
 */
export class WebGLHealthMonitor {
  constructor() {
    this.errorHistory = [];
    this.contextLossCount = 0;
    this.lastHealthCheck = 0;
    this.isMonitoring = false;
    this.maxErrorHistory = 50;
    this.healthCheckInterval = 5000; // 5 seconds
  }

  /**
   * Start monitoring WebGL health
   * @param {HTMLCanvasElement} canvas - Canvas to monitor
   * @param {Function} onIssueDetected - Callback when issues are detected
   */
  startMonitoring(canvas, onIssueDetected) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.canvas = canvas;
    this.onIssueDetected = onIssueDetected;
    
    // Set up context loss monitoring
    this.setupContextLossHandling();
    
    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    console.log('WebGL Health Monitor started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.contextLostHandler);
      this.canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler);
    }
    
    console.log('WebGL Health Monitor stopped');
  }

  /**
   * Set up context loss event handling
   */
  setupContextLossHandling() {
    if (!this.canvas) return;
    
    this.contextLostHandler = (event) => {
      event.preventDefault();
      this.contextLossCount++;
      this.recordError('CONTEXT_LOST', 'WebGL context was lost');
      
      console.warn(`WebGL context lost (${this.contextLossCount} times)`);
      
      if (this.onIssueDetected) {
        this.onIssueDetected({
          type: 'CONTEXT_LOST',
          severity: 'HIGH',
          message: 'WebGL context was lost',
          suggestedAction: 'RESTART_VIEWER'
        });
      }
    };
    
    this.contextRestoredHandler = () => {
      console.log('WebGL context restored');
      
      if (this.onIssueDetected) {
        this.onIssueDetected({
          type: 'CONTEXT_RESTORED',
          severity: 'INFO',
          message: 'WebGL context was restored',
          suggestedAction: 'REINITIALIZE'
        });
      }
    };
    
    this.canvas.addEventListener('webglcontextlost', this.contextLostHandler);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler);
  }

  /**
   * Perform periodic health check
   */
  performHealthCheck() {
    if (!this.canvas) return;
    
    try {
      const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      
      if (!gl) {
        this.recordError('NO_CONTEXT', 'WebGL context not available');
        return;
      }
      
      if (gl.isContextLost()) {
        this.recordError('CONTEXT_LOST_DETECTED', 'Context loss detected in health check');
        return;
      }
      
      // Test basic WebGL operations
      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        this.recordError('WEBGL_ERROR', `WebGL error: ${error}`);
      }
      
      // Check memory usage indicators
      const memoryInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (memoryInfo) {
        // Log memory-related information for monitoring
        // This is informational and doesn't trigger errors
      }
      
      this.lastHealthCheck = Date.now();
      
    } catch (error) {
      this.recordError('HEALTH_CHECK_FAILED', error.message);
    }
  }

  /**
   * Record an error in the history
   * @param {string} type - Error type
   * @param {string} message - Error message
   */
  recordError(type, message) {
    const errorRecord = {
      type,
      message,
      timestamp: Date.now(),
      canvasValid: !!this.canvas,
      contextValid: this.canvas ? !!(this.canvas.getContext('webgl2') || this.canvas.getContext('webgl')) : false
    };
    
    this.errorHistory.push(errorRecord);
    
    // Keep error history manageable
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
    
    console.warn('WebGL Health Monitor recorded error:', errorRecord);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStatistics() {
    const now = Date.now();
    const last5Minutes = this.errorHistory.filter(error => now - error.timestamp < 300000);
    const lastMinute = this.errorHistory.filter(error => now - error.timestamp < 60000);
    
    return {
      totalErrors: this.errorHistory.length,
      errorsLast5Minutes: last5Minutes.length,
      errorsLastMinute: lastMinute.length,
      contextLossCount: this.contextLossCount,
      lastHealthCheck: this.lastHealthCheck,
      isHealthy: lastMinute.length === 0 && this.lastHealthCheck > now - this.healthCheckInterval * 2
    };
  }

  /**
   * Assess WebGL health status
   * @returns {Object} Health assessment
   */
  assessHealth() {
    const stats = this.getErrorStatistics();
    
    let healthStatus = 'HEALTHY';
    let recommendations = [];
    
    if (stats.contextLossCount > 0) {
      healthStatus = 'UNSTABLE';
      recommendations.push('Graphics driver update recommended');
    }
    
    if (stats.errorsLastMinute > 3) {
      healthStatus = 'CRITICAL';
      recommendations.push('Restart viewer immediately');
    } else if (stats.errorsLast5Minutes > 10) {
      healthStatus = 'DEGRADED';
      recommendations.push('Consider restarting viewer');
    }
    
    if (!stats.isHealthy) {
      healthStatus = 'UNKNOWN';
      recommendations.push('Health monitoring interrupted');
    }
    
    return {
      status: healthStatus,
      statistics: stats,
      recommendations
    };
  }
}

/**
 * WebGL Recovery Manager - handles automatic recovery from WebGL issues
 */
export class WebGLRecoveryManager {
  constructor() {
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.recoveryStrategies = [
      this.softRecovery.bind(this),
      this.mediumRecovery.bind(this),
      this.hardRecovery.bind(this)
    ];
  }

  /**
   * Attempt recovery from WebGL error
   * @param {HTMLElement} container - Container element
   * @param {Function} reinitializeCallback - Function to reinitialize viewer
   * @returns {Promise<boolean>} Success status
   */
  async attemptRecovery(container, reinitializeCallback) {
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error('Maximum recovery attempts reached');
      return false;
    }

    const strategy = this.recoveryStrategies[this.recoveryAttempts];
    this.recoveryAttempts++;

    console.log(`Attempting WebGL recovery strategy ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);

    try {
      await strategy(container);
      
      // Wait for recovery to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Attempt to reinitialize
      await reinitializeCallback();
      
      console.log(`WebGL recovery strategy ${this.recoveryAttempts} succeeded`);
      this.recoveryAttempts = 0; // Reset on success
      return true;
      
    } catch (error) {
      console.warn(`WebGL recovery strategy ${this.recoveryAttempts} failed:`, error);
      
      if (this.recoveryAttempts < this.maxRecoveryAttempts) {
        // Try next strategy
        return this.attemptRecovery(container, reinitializeCallback);
      } else {
        return false;
      }
    }
  }

  /**
   * Soft recovery - clear container and wait
   */
  async softRecovery(container) {
    console.log('Performing soft WebGL recovery...');
    
    if (container) {
      container.innerHTML = '';
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Medium recovery - force context loss and recovery
   */
  async mediumRecovery(container) {
    console.log('Performing medium WebGL recovery...');
    
    // Clear container
    if (container) {
      container.innerHTML = '';
    }
    
    // Try to force WebGL context cleanup
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    
    if (gl) {
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
    
    // Wait longer for recovery
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Hard recovery - clear all caches and force cleanup
   */
  async hardRecovery(container) {
    console.log('Performing hard WebGL recovery...');
    
    // Clear container
    if (container) {
      container.innerHTML = '';
    }
    
    // Clear any cached WebGL contexts
    if (window.WebGLRenderingContext) {
      // Force cleanup of any remaining contexts
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
      });
    }
    
    // Force multiple garbage collections
    if (window.gc) {
      for (let i = 0; i < 3; i++) {
        window.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Wait for full cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Reset recovery attempts counter
   */
  reset() {
    this.recoveryAttempts = 0;
  }
}

export default {
  WebGLHealthMonitor,
  WebGLRecoveryManager
};
