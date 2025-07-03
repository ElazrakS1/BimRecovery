/**
 * Console Commands for WebGL Error Control
 * Copy and paste these commands in browser console to control error logging
 */

// 🔇 ACTIVATE SILENT MODE (recommended to reduce spam)
// This will suppress almost all shader error logs while keeping protection active
window.setShaderProtectionSilent = function() {
  if (window.setSimpleProtectionSilentMode) {
    window.setSimpleProtectionSilentMode(true);
    console.log('✅ Silent mode activated - shader errors will be suppressed silently');
  } else {
    console.warn('❌ Protection system not loaded yet');
  }
};

// 🔊 ACTIVATE VERBOSE MODE 
// This will show periodic summaries of suppressed errors
window.setShaderProtectionVerbose = function() {
  if (window.setSimpleProtectionSilentMode) {
    window.setSimpleProtectionSilentMode(false);
    console.log('✅ Verbose mode activated - will show periodic error summaries');
  } else {
    console.warn('❌ Protection system not loaded yet');
  }
};

// 📊 GET PROTECTION STATS
// Shows how many errors have been suppressed
window.getShaderStats = function() {
  if (window.getSimpleProtectionStats) {
    const stats = window.getSimpleProtectionStats();
    if (stats) {
      console.log('📊 Shader Protection Stats:', {
        isActive: stats.isActive,
        errorsSuppressed: stats.errorCount,
        lastErrorTime: new Date(stats.lastErrorTime).toLocaleTimeString(),
        silentMode: stats.silentMode || 'Unknown'
      });
    } else {
      console.log('📭 No protection stats available');
    }
  } else {
    console.warn('❌ Protection system not loaded yet');
  }
};

// 🛑 DISABLE PROTECTION (not recommended)
// This will stop suppressing shader errors - use only for debugging
window.disableShaderProtection = function() {
  if (window.deactivateSimpleShaderProtection) {
    window.deactivateSimpleShaderProtection();
    console.log('🛑 Shader protection disabled - errors will now appear in console');
  } else {
    console.warn('❌ Protection system not loaded yet');
  }
};

// 🔄 RE-ENABLE PROTECTION
// Reactivates protection if it was disabled
window.enableShaderProtection = function() {
  if (window.activateSimpleShaderProtection) {
    window.activateSimpleShaderProtection(true); // Silent mode by default
    console.log('🛡️ Shader protection re-enabled in silent mode');
  } else {
    console.warn('❌ Protection system not loaded yet');
  }
};

console.log(`
🎛️ SHADER ERROR CONTROL PANEL
================================

Available commands:
• setShaderProtectionSilent()    - Enable silent mode (recommended)
• setShaderProtectionVerbose()   - Enable periodic summaries  
• getShaderStats()               - Show error suppression statistics
• disableShaderProtection()     - Turn off protection (not recommended)
• enableShaderProtection()      - Turn on protection with silent mode

💡 To stop spam immediately, run:
   setShaderProtectionSilent()

📊 To see how many errors are being blocked:
   getShaderStats()
`);

export {};
