// Quick Validation Script for Shader Protection Fix
// Copy and paste this into your browser console to test the solution

(function() {
  console.log('🔧 SHADER PROTECTION VALIDATION');
  console.log('================================');
  
  let errorCount = 0;
  let criticalErrors = 0;
  const startTime = Date.now();
  
  // Monitor console.error calls
  const originalError = console.error;
  console.error = function(...args) {
    const errorMsg = args.join(' ');
    errorCount++;
    
    if (errorMsg.includes('Cannot read properties of null') && errorMsg.includes('trim')) {
      criticalErrors++;
      console.warn(`❌ CRITICAL ERROR #${criticalErrors}:`, errorMsg);
    }
    
    return originalError.apply(console, args);
  };
  
  // Check for shader protection
  setTimeout(() => {
    const hasProtection = window.ShaderProtection || 
                         document.querySelector('script[src*="shader-protection"]') ||
                         console.log.toString().includes('shader protection');
    
    console.log('📊 RESULTS AFTER 10 SECONDS:');
    console.log(`Total errors: ${errorCount}`);
    console.log(`Critical "trim" errors: ${criticalErrors}`);
    console.log(`Protection detected: ${hasProtection ? '✅' : '❓'}`);
    
    if (criticalErrors === 0) {
      console.log('✅ SUCCESS: No critical errors detected!');
    } else {
      console.log(`❌ ISSUE: ${criticalErrors} critical errors found`);
    }
    
    console.error = originalError;
  }, 10000);
  
  console.log('⏳ Monitoring for 10 seconds...');
  console.log('Navigate to a maquette page to trigger the test');
})();
