/**
 * Proactive WebGL Recovery System for Maquette Loading
 * Automatically detects and recovers from WebGL context loss to restore maquette display
 */

export class ProactiveWebGLRecovery {
  constructor() {
    this.isRecovering = false;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.onRecoveryCallbacks = [];
    this.lastRecoveryTime = 0;
    this.recoveryDelay = 2000; // 2 seconds
  }

  /**
   * Register a callback to be called when recovery is needed
   */
  onRecoveryNeeded(callback) {
    this.onRecoveryCallbacks.push(callback);
  }

  /**
   * Detect WebGL context loss and trigger recovery
   */
  detectAndRecover(canvas, viewer) {
    if (this.isRecovering) {
      console.log('🔄 Recovery already in progress, skipping...');
      return;
    }

    const now = Date.now();
    if (now - this.lastRecoveryTime < this.recoveryDelay) {
      console.log('🕐 Recovery attempted too recently, waiting...');
      return;
    }

    this.isRecovering = true;
    this.lastRecoveryTime = now;
    this.recoveryAttempts++;

    console.log(`🚨 WebGL Context Lost detected! Starting recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);

    // Show user notification
    this.showRecoveryNotification();

    // Attempt recovery after a brief delay
    setTimeout(() => {
      this.attemptRecovery(canvas, viewer);
    }, 1000);
  }

  /**
   * Attempt to recover WebGL context and reload maquettes
   */
  async attemptRecovery(canvas, viewer) {
    try {
      console.log('🔧 Starting WebGL context recovery...');

      // Step 1: Force garbage collection if available
      if (window.gc) {
        console.log('🗑️ Running garbage collection...');
        window.gc();
      }

      // Step 2: Clear WebGL-related caches
      if (viewer && viewer.context) {
        console.log('🧹 Clearing WebGL caches...');
        try {
          // Clear Three.js caches
          if (window.THREE) {
            window.THREE.Cache.clear();
          }
          
          // Clear renderer
          if (viewer.context.renderer) {
            viewer.context.renderer.dispose();
          }
        } catch (error) {
          console.warn('⚠️ Error clearing caches:', error);
        }
      }

      // Step 3: Wait for context restoration
      console.log('⏳ Waiting for WebGL context restoration...');
      await this.waitForContextRestoration(canvas);

      // Step 4: Reinitialize viewer
      console.log('🔄 Reinitializing viewer...');
      await this.reinitializeViewer(viewer);

      // Step 5: Reload maquettes
      console.log('📦 Reloading maquettes...');
      await this.reloadMaquettes(viewer);

      // Recovery successful
      this.isRecovering = false;
      this.recoveryAttempts = 0;
      console.log('✅ WebGL recovery completed successfully!');
      
      this.showSuccessNotification();

    } catch (error) {
      console.error('❌ WebGL recovery failed:', error);
      this.handleRecoveryFailure(error);
    }
  }

  /**
   * Wait for WebGL context to be restored
   */
  waitForContextRestoration(canvas) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebGL context restoration timeout'));
      }, 10000); // 10 second timeout

      const checkContext = () => {
        try {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl && !gl.isContextLost()) {
            clearTimeout(timeout);
            console.log('🟢 WebGL context restored successfully');
            resolve(gl);
          } else {
            setTimeout(checkContext, 100);
          }
        } catch (error) {
          setTimeout(checkContext, 100);
        }
      };

      checkContext();
    });
  }

  /**
   * Reinitialize the IFC viewer
   */
  async reinitializeViewer(viewer) {
    if (!viewer) {
      throw new Error('Viewer not available for reinitialization');
    }

    try {
      // Trigger viewer reinitialization
      for (const callback of this.onRecoveryCallbacks) {
        await callback('reinitialize-viewer');
      }
    } catch (error) {
      console.error('Error reinitializing viewer:', error);
      throw error;
    }
  }

  /**
   * Reload all maquettes that were previously loaded
   */
  async reloadMaquettes(viewer) {
    try {
      // Get list of previously loaded models from localStorage or state
      const previousModels = this.getPreviouslyLoadedModels();
      
      if (previousModels.length === 0) {
        console.log('📭 No previous maquettes to reload');
        return;
      }

      console.log(`🔄 Reloading ${previousModels.length} maquettes...`);

      for (const modelInfo of previousModels) {
        try {
          await this.reloadSingleMaquette(viewer, modelInfo);
        } catch (error) {
          console.warn(`⚠️ Failed to reload maquette ${modelInfo.name}:`, error);
        }
      }

      // Trigger callbacks for maquette reload
      for (const callback of this.onRecoveryCallbacks) {
        await callback('maquettes-reloaded');
      }

    } catch (error) {
      console.error('Error reloading maquettes:', error);
      throw error;
    }
  }

  /**
   * Reload a single maquette
   */
  async reloadSingleMaquette(viewer, modelInfo) {
    console.log(`📦 Reloading maquette: ${modelInfo.name}`);
    
    // Trigger maquette reload through callbacks
    for (const callback of this.onRecoveryCallbacks) {
      await callback('reload-maquette', modelInfo);
    }
  }

  /**
   * Get previously loaded models from storage
   */
  getPreviouslyLoadedModels() {
    try {
      const stored = localStorage.getItem('bim-loaded-models');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Could not retrieve previously loaded models:', error);
      return [];
    }
  }

  /**
   * Store loaded model info for recovery
   */
  storeLoadedModel(modelInfo) {
    try {
      const existing = this.getPreviouslyLoadedModels();
      const updated = existing.filter(m => m.id !== modelInfo.id);
      updated.push(modelInfo);
      localStorage.setItem('bim-loaded-models', JSON.stringify(updated));
    } catch (error) {
      console.warn('Could not store loaded model info:', error);
    }
  }

  /**
   * Handle recovery failure
   */
  handleRecoveryFailure(error) {
    this.isRecovering = false;

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error('💥 Max recovery attempts reached. Manual refresh required.');
      this.showFailureNotification();
    } else {
      console.log(`🔄 Recovery attempt ${this.recoveryAttempts} failed, will retry...`);
      // Wait before next attempt
      setTimeout(() => {
        this.isRecovering = false;
      }, this.recoveryDelay);
    }
  }

  /**
   * Show recovery notification to user
   */
  showRecoveryNotification() {
    // Dispatch custom event for UI notification
    window.dispatchEvent(new CustomEvent('webgl-recovery-started', {
      detail: {
        attempt: this.recoveryAttempts,
        maxAttempts: this.maxRecoveryAttempts
      }
    }));
  }

  /**
   * Show success notification
   */
  showSuccessNotification() {
    window.dispatchEvent(new CustomEvent('webgl-recovery-success'));
  }

  /**
   * Show failure notification
   */
  showFailureNotification() {
    window.dispatchEvent(new CustomEvent('webgl-recovery-failed', {
      detail: {
        attempts: this.recoveryAttempts,
        maxAttempts: this.maxRecoveryAttempts
      }
    }));
  }

  /**
   * Reset recovery state
   */
  reset() {
    this.isRecovering = false;
    this.recoveryAttempts = 0;
    this.lastRecoveryTime = 0;
  }
}

// Global instance
export const proactiveWebGLRecovery = new ProactiveWebGLRecovery();

export default ProactiveWebGLRecovery;
