// Test script to verify WASM loading
import { IfcAPI } from 'web-ifc';

console.log('Starting WASM test...');

async function testWasm() {
    try {
        console.log('Creating IfcAPI instance...');
        const ifcApi = new IfcAPI();
        
        console.log('Setting WASM path...');
        ifcApi.SetWasmPath('./public/wasm/');
        
        console.log('Initializing IfcAPI...');
        await ifcApi.Init();
        
        console.log('✅ WASM loaded successfully! The linking error has been resolved.');
        console.log('IfcAPI version:', ifcApi.GetVersion?.() || 'Version method not available');
        
        return true;
    } catch (error) {
        console.error('❌ WASM loading failed:', error.message);
        
        if (error.message.includes('Cannot read properties of null')) {
            console.error('This is the original WASM linking error - version compatibility issue persists');
        } else if (error.message.includes('Import #49')) {
            console.error('WebAssembly import error - function signature mismatch');
        } else if (error.message.includes('LinkError')) {
            console.error('WebAssembly linking error - missing or incompatible functions');
        }
        
        return false;
    }
}

// Run the test
testWasm().then(success => {
    console.log('\n--- Test Results ---');
    if (success) {
        console.log('🎉 All tests passed! WASM is working correctly.');
    } else {
        console.log('💥 Tests failed. WASM linking issue still exists.');
    }
    process.exit(success ? 0 : 1);
});
