// CSS Brace Matching Tool
import fs from 'fs';

const cssContent = fs.readFileSync('src/components/header/Header.css', 'utf8');
const lines = cssContent.split('\n');

let braceStack = [];
let openBraces = 0;
let closeBraces = 0;
let issues = [];

lines.forEach((line, index) => {
  const lineNum = index + 1;
  const trimmedLine = line.trim();
  
  // Count braces in this line
  const openBracesInLine = (line.match(/\{/g) || []).length;
  const closeBracesInLine = (line.match(/\}/g) || []).length;
  
  openBraces += openBracesInLine;
  closeBraces += closeBracesInLine;
  
  // Track brace balance for this line
  for (let i = 0; i < openBracesInLine; i++) {
    braceStack.push(lineNum);
  }
  
  for (let i = 0; i < closeBracesInLine; i++) {
    if (braceStack.length === 0) {
      issues.push(`Line ${lineNum}: Unexpected closing brace - no matching opening brace`);
    } else {
      braceStack.pop();
    }
  }
  
  // Check for malformed lines
  if (trimmedLine.endsWith('{') && trimmedLine.includes('}')) {
    issues.push(`Line ${lineNum}: Line contains both opening and closing brace: "${trimmedLine}"`);
  }
  
  if (trimmedLine === '}' && index > 0 && lines[index - 1].trim() === '}') {
    issues.push(`Line ${lineNum}: Consecutive closing braces detected`);
  }
});

console.log('🔍 CSS Brace Analysis:');
console.log(`📊 Total: ${openBraces} open, ${closeBraces} close`);
console.log(`🎯 Balance: ${openBraces === closeBraces ? '✅ BALANCED' : '❌ UNBALANCED'}`);

if (braceStack.length > 0) {
  console.log(`\n❌ Unclosed braces found (${braceStack.length}):`);
  braceStack.forEach(lineNum => {
    console.log(`   - Opening brace at line ${lineNum} never closed`);
    console.log(`     Content: "${lines[lineNum - 1].trim()}"`);
  });
}

if (issues.length > 0) {
  console.log(`\n🚨 Issues found (${issues.length}):`);
  issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log(`\n${openBraces === closeBraces && issues.length === 0 ? '✅' : '❌'} CSS is ${openBraces === closeBraces && issues.length === 0 ? 'VALID' : 'INVALID'}`);
