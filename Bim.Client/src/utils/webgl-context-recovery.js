/**
 * Enhanced WebGL Context Recovery System
 * Specifically designed to handle WebGL context loss and recovery
 */

export class WebGLContextRecovery {
  constructor() {
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.isRecovering = false;
    this.contextLossListeners = [];
    this.recoveryCallbacks = [];
  }

  /**
   * Initialize context loss monitoring for a canvas
   */
  monitorCanvas(canvas, onContextLoss, onContextRestore) {
    if (!canvas || !canvas.getContext) {
      console.warn('Invalid canvas provided for WebGL context monitoring');
      return;
    }

    const contextLostHandler = (event) => {
      event.preventDefault();
      console.warn('🔴 WebGL Context Lost - Starting recovery process...');
      
      this.handleContextLoss(onContextLoss);
    };

    const contextRestoreHandler = () => {
      console.log('🟢 WebGL Context Restored - Recovery successful');
      this.handleContextRestore(onContextRestore);
    };

    canvas.addEventListener('webglcontextlost', contextLostHandler);
    canvas.addEventListener('webglcontextrestored', contextRestoreHandler);

    // Store listeners for cleanup
    this.contextLossListeners.push({
      canvas,
      contextLostHandler,
      contextRestoreHandler
    });

    return () => {
      canvas.removeEventListener('webglcontextlost', contextLostHandler);
      canvas.removeEventListener('webglcontextrestored', contextRestoreHandler);
    };
  }

  /**
   * Handle WebGL context loss
   */
  handleContextLoss(callback) {
    if (this.isRecovering) {
      console.log('Recovery already in progress, skipping...');
      return;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;

    // Provide immediate user feedback
    this.showUserMessage({
      type: 'warning',
      title: 'WebGL Context Lost',
      message: `Graphics context was lost (Attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}). Attempting recovery...`,
      suggestions: [
        'This usually happens due to GPU driver issues or insufficient memory',
        'The application will attempt automatic recovery',
        'If recovery fails, try refreshing the page or closing other tabs'
      ]
    });

    // Clear any existing timers
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    // Attempt recovery after a brief delay
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(callback);
    }, 1000);
  }

  /**
   * Attempt to recover from context loss
   */
  async attemptRecovery(callback) {
    try {
      console.log(`🔄 Attempting WebGL context recovery (${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }

      // Clear WebGL-related caches
      this.clearWebGLCaches();

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call the recovery callback if provided
      if (callback && typeof callback === 'function') {
        await callback();
      }

      // Test if WebGL is available again
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      
      if (!gl) {
        throw new Error('WebGL context still not available after recovery attempt');
      }

      // Clean up test canvas
      testCanvas.remove();

      console.log('✅ WebGL context recovery successful');
      
      this.showUserMessage({
        type: 'success',
        title: 'Recovery Successful',
        message: 'WebGL context has been restored. The application should work normally now.',
        autoHide: 3000
      });

    } catch (error) {
      console.error('❌ WebGL context recovery failed:', error);
      
      if (this.recoveryAttempts < this.maxRecoveryAttempts) {
        // Schedule another recovery attempt
        console.log(`Scheduling recovery attempt ${this.recoveryAttempts + 1}/${this.maxRecoveryAttempts}`);
        
        this.recoveryTimer = setTimeout(() => {
          this.attemptRecovery(callback);
        }, 2000 * this.recoveryAttempts); // Progressive delay
        
      } else {
        // Max attempts reached
        console.error('🚨 Maximum recovery attempts reached. Manual intervention required.');
        
        this.showUserMessage({
          type: 'error',
          title: 'Recovery Failed',
          message: `WebGL context recovery failed after ${this.maxRecoveryAttempts} attempts.`,
          suggestions: [
            'Try refreshing the page (Ctrl+F5)',
            'Close other browser tabs to free up GPU memory',
            'Update your graphics drivers',
            'Try using a different browser',
            'Restart your browser completely'
          ],
          persistent: true
        });
      }
    }
  }

  /**
   * Handle WebGL context restoration
   */
  handleContextRestore(callback) {
    this.isRecovering = false;
    this.recoveryAttempts = 0;

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    console.log('🎉 WebGL context fully restored');

    if (callback && typeof callback === 'function') {
      callback();
    }

    // Hide any recovery messages
    this.hideUserMessages();
  }

  /**
   * Clear WebGL-related caches and resources
   */
  clearWebGLCaches() {
    try {
      // Clear any Three.js caches if available
      if (window.THREE && window.THREE.Cache) {
        window.THREE.Cache.clear();
      }

      // Clear browser caches related to WebGL
      const cacheNames = ['webgl-cache', 'gpu-cache', 'shader-cache'];
      cacheNames.forEach(cacheName => {
        if ('caches' in window) {
          caches.delete(cacheName).catch(() => {
            // Ignore errors
          });
        }
      });

      console.log('🧹 WebGL caches cleared');
    } catch (error) {
      console.warn('Error clearing WebGL caches:', error);
    }
  }

  /**
   * Show user message
   */
  showUserMessage({ type, title, message, suggestions = [], autoHide = null, persistent = false }) {
    // Remove any existing messages
    this.hideUserMessages();

    const messageDiv = document.createElement('div');
    messageDiv.id = 'webgl-recovery-message';
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      ${this.getMessageStyles(type)}
    `;

    let innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 18px; margin-right: 8px;">${this.getMessageIcon(type)}</span>
        <strong style="font-size: 16px;">${title}</strong>
      </div>
      <div style="margin-bottom: 10px;">${message}</div>
    `;

    if (suggestions.length > 0) {
      innerHTML += `
        <div style="margin-top: 15px;">
          <strong>Suggestions:</strong>
          <ul style="margin: 5px 0 0 0; padding-left: 20px;">
            ${suggestions.map(suggestion => `<li style="margin: 2px 0;">${suggestion}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (!persistent) {
      innerHTML += `
        <button onclick="this.parentElement.remove()" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
        ">×</button>
      `;
    }

    messageDiv.innerHTML = innerHTML;
    document.body.appendChild(messageDiv);

    if (autoHide && !persistent) {
      setTimeout(() => {
        this.hideUserMessages();
      }, autoHide);
    }
  }

  /**
   * Get message styles based on type
   */
  getMessageStyles(type) {
    const styles = {
      warning: 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404;',
      error: 'background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;',
      success: 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724;',
      info: 'background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460;'
    };
    return styles[type] || styles.info;
  }

  /**
   * Get message icon based on type
   */
  getMessageIcon(type) {
    const icons = {
      warning: '⚠️',
      error: '❌',
      success: '✅',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Hide user messages
   */
  hideUserMessages() {
    const existingMessage = document.getElementById('webgl-recovery-message');
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  /**
   * Clean up all listeners and timers
   */
  destroy() {
    // Remove all context loss listeners
    this.contextLossListeners.forEach(({ canvas, contextLostHandler, contextRestoreHandler }) => {
      canvas.removeEventListener('webglcontextlost', contextLostHandler);
      canvas.removeEventListener('webglcontextrestored', contextRestoreHandler);
    });

    // Clear timers
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    // Hide messages
    this.hideUserMessages();

    // Reset state
    this.contextLossListeners = [];
    this.recoveryCallbacks = [];
    this.isRecovering = false;
    this.recoveryAttempts = 0;
  }
}

// Create and export a singleton instance
export const webglContextRecovery = new WebGLContextRecovery();

// Auto-setup for common WebGL contexts
export function setupAutoWebGLRecovery() {
  console.log('🛡️ Setting up automatic WebGL context recovery...');
  
  // Monitor for canvas elements being added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'CANVAS') {
          const gl = node.getContext('webgl2') || node.getContext('webgl');
          if (gl) {
            console.log('📱 Found WebGL canvas, setting up context monitoring...');
            webglContextRecovery.monitorCanvas(node, 
              () => {
                // Context loss callback
                console.log('Handling context loss for canvas...');
              },
              () => {
                // Context restore callback
                console.log('Context restored for canvas');
              }
            );
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return () => {
    observer.disconnect();
    webglContextRecovery.destroy();
  };
}
