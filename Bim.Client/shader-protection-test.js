/**
 * Browser Test for Shader Protection Solution
 * Tests the fix for "Cannot read properties of null (reading 'trim')" error
 */

console.log('🔧 SHADER PROTECTION TEST STARTED');
console.log('='.repeat(50));

// Test configuration
const TEST_CONFIG = {
  errorMonitoringDuration: 30000, // 30 seconds
  expectedErrors: [
    'Cannot read properties of null (reading \'trim\')',
    'WebGLProgram',
    'shader compilation failed'
  ],
  maxAcceptableErrors: 5 // We should see significantly fewer errors
};

// Error monitoring
const errorLog = [];
let startTime = Date.now();

// Override console.error to monitor for the specific error
const originalConsoleError = console.error;
console.error = function(...args) {
  const errorMessage = args.join(' ');
  const timestamp = Date.now() - startTime;
  
  errorLog.push({
    message: errorMessage,
    timestamp: timestamp,
    args: args
  });
  
  // Check for the critical error we're trying to fix
  if (errorMessage.includes('Cannot read properties of null') && errorMessage.includes('trim')) {
    console.warn(`❌ CRITICAL ERROR DETECTED at ${timestamp}ms:`, errorMessage);
  }
  
  // Call original console.error
  return originalConsoleError.apply(console, args);
};

// Monitor for shader protection activation
console.log('👀 Monitoring for shader protection activation...');

// Function to analyze results
function analyzeResults() {
  console.log('\n📊 TEST RESULTS ANALYSIS');
  console.log('='.repeat(50));
  
  const criticalErrors = errorLog.filter(error => 
    error.message.includes('Cannot read properties of null') && 
    error.message.includes('trim')
  );
  
  const shaderErrors = errorLog.filter(error => 
    error.message.includes('shader') || 
    error.message.includes('WebGLProgram')
  );
  
  console.log(`📈 Total errors monitored: ${errorLog.length}`);
  console.log(`🔴 Critical "trim of null" errors: ${criticalErrors.length}`);
  console.log(`🟡 Shader-related errors: ${shaderErrors.length}`);
  
  if (criticalErrors.length === 0) {
    console.log('✅ SUCCESS: No critical "trim of null" errors detected!');
  } else {
    console.log(`❌ ISSUE: ${criticalErrors.length} critical errors still occurring`);
    criticalErrors.forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.timestamp}ms] ${error.message}`);
    });
  }
  
  if (errorLog.length < TEST_CONFIG.maxAcceptableErrors) {
    console.log('✅ SUCCESS: Error count is within acceptable limits');
  } else {
    console.log(`⚠️  WARNING: High error count (${errorLog.length}), investigating...`);
  }
  
  // Show error frequency analysis
  if (criticalErrors.length > 1) {
    const intervals = [];
    for (let i = 1; i < criticalErrors.length; i++) {
      intervals.push(criticalErrors[i].timestamp - criticalErrors[i-1].timestamp);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    console.log(`📊 Average interval between critical errors: ${avgInterval.toFixed(2)}ms`);
    
    if (avgInterval < 100) {
      console.log('❌ CRITICAL: Errors occurring too frequently (infinite loop detected)');
    }
  }
}

// Monitor page navigation to IFC viewer
function monitorPageNavigation() {
  console.log('🚀 Looking for IFC viewer navigation...');
  
  // Check if we're on a page with IFC viewer
  const checkForViewer = () => {
    const viewerContainer = document.querySelector('.viewer-container') || 
                           document.querySelector('[class*="viewer"]') ||
                           document.querySelector('canvas');
    
    if (viewerContainer) {
      console.log('🎯 IFC Viewer container detected!');
      console.log('📱 Starting intensive error monitoring...');
      
      // Start intensive monitoring when viewer is active
      setTimeout(analyzeResults, TEST_CONFIG.errorMonitoringDuration);
    } else {
      console.log('⏳ No viewer detected yet, continuing to monitor...');
      setTimeout(checkForViewer, 2000);
    }
  };
  
  checkForViewer();
}

// Start monitoring
setTimeout(monitorPageNavigation, 1000);

// Instructions for manual testing
console.log('\n📋 MANUAL TEST INSTRUCTIONS:');
console.log('1. Navigate to a page with maquette/IFC viewer');
console.log('2. Try to open/load an IFC file');
console.log('3. Watch this console for 30 seconds');
console.log('4. Results will be analyzed automatically');
console.log('\n⏱️  Test will run for', TEST_CONFIG.errorMonitoringDuration / 1000, 'seconds');

// Cleanup after test
setTimeout(() => {
  console.error = originalConsoleError;
  console.log('\n🔧 Test completed - console.error restored');
}, TEST_CONFIG.errorMonitoringDuration + 5000);
