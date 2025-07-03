/**
 * WebGL compatibility and capability checker
 */

/**
 * Checks if WebGL is available and returns compatibility info
 * @returns {Object} WebGL compatibility information
 */
export function checkWebGLCompatibility() {
  const canvas = document.createElement('canvas');
  let gl = null;
  let info = {
    supported: false,
    webgl2: false,
    renderer: '',
    vendor: '',
    error: null
  };

  try {
    // Try WebGL 2 first (preferred)
    gl = canvas.getContext('webgl2');
    if (gl) {
      info.supported = true;
      info.webgl2 = true;
    } else {
      // Fall back to WebGL 1
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        info.supported = true;
        info.webgl2 = false;
      }
    }

    // If WebGL is supported, get additional info
    if (info.supported && gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        info.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        info.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
      
      // Check for key capabilities required by the IFC viewer
      info.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      info.maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
      
      // Check for important extensions
      info.extensions = {
        floatTextures: !!gl.getExtension('OES_texture_float'),
        depthTexture: !!gl.getExtension('WEBGL_depth_texture'),
        anisotropicFiltering: !!gl.getExtension('EXT_texture_filter_anisotropic'),
        instancing: info.webgl2 || !!gl.getExtension('ANGLE_instanced_arrays')
      };
    }
  } catch (error) {
    info.error = error.message;
    info.supported = false;
  } finally {
    // Clean up WebGL context
    if (gl) {
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
  }

  return info;
}

/**
 * Creates a WebGL renderer with optimal settings for IFC viewer
 * @param {HTMLElement} container - DOM element to contain the renderer
 * @returns {Object} WebGL renderer configuration
 */
export function createOptimalWebGLConfig() {
  const webglInfo = checkWebGLCompatibility();
  
  if (!webglInfo.supported) {
    throw new Error('WebGL is not supported in this browser');
  }
  
  // Configure optimal WebGL parameters
  const config = {
    canvas: document.createElement('canvas'),
    contextAttributes: {
      alpha: true,
      antialias: true,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      stencil: false
    }
  };
  
  // For lower-end devices, disable some features
  if (webglInfo.maxTextureSize < 4096 || webglInfo.maxTextureUnits < 8) {
    config.contextAttributes.antialias = false;
    config.lowPowerMode = true;
  }
  
  return config;
}
