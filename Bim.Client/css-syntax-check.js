// CSS Syntax Validation Test
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssFilePath = path.join(__dirname, 'src', 'components', 'header', 'Header.css');

console.log('🔍 Checking CSS syntax for Header.css...');

try {
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');
  
  // Basic syntax checks
  const openBraces = (cssContent.match(/\{/g) || []).length;
  const closeBraces = (cssContent.match(/\}/g) || []).length;
  
  console.log(`📊 CSS Statistics:`);
  console.log(`   - Open braces: ${openBraces}`);
  console.log(`   - Close braces: ${closeBraces}`);
  console.log(`   - Balanced: ${openBraces === closeBraces ? '✅ YES' : '❌ NO'}`);
  
  // Check for common syntax errors
  const duplicateClosing = cssContent.match(/\}\s*\}/g);
  const orphanedClosing = cssContent.match(/^\s*\}/gm);
  const missingSelector = cssContent.match(/\{\s*\}/g);
  
  console.log(`\n🔍 Error Checks:`);
  console.log(`   - Duplicate closing braces: ${duplicateClosing ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`   - Orphaned closing braces: ${orphanedClosing ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`   - Empty selectors: ${missingSelector ? '❌ FOUND' : '✅ NONE'}`);
  
  // Check the specific area that was problematic
  const lines = cssContent.split('\n');
  const problemArea = lines.slice(125, 140);
  
  console.log(`\n📝 Fixed Area (lines 126-140):`);
  problemArea.forEach((line, index) => {
    const lineNum = 126 + index;
    console.log(`   ${lineNum.toString().padStart(3)}: ${line}`);
  });
  
  if (openBraces === closeBraces) {
    console.log(`\n🎉 CSS SYNTAX IS VALID! The PostCSS error should be resolved.`);
  } else {
    console.log(`\n❌ CSS SYNTAX STILL HAS ISSUES. Please check brace balance.`);
  }
  
} catch (error) {
  console.error('❌ Error reading CSS file:', error.message);
}
