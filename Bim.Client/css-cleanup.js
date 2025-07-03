// CSS Cleanup Script
import fs from 'fs';

const cssContent = fs.readFileSync('src/components/header/Header.css', 'utf8');
const lines = cssContent.split('\n');

let cleanedLines = [];
let previousLineWasClosingBrace = false;

lines.forEach((line, index) => {
  const trimmedLine = line.trim();
  const isClosingBrace = trimmedLine === '}';
  
  // Skip duplicate closing braces
  if (isClosingBrace && previousLineWasClosingBrace) {
    console.log(`Removing duplicate closing brace at line ${index + 1}`);
    return; // Skip this line
  }
  
  cleanedLines.push(line);
  previousLineWasClosingBrace = isClosingBrace;
});

// Write the cleaned CSS back to the file
const cleanedContent = cleanedLines.join('\n');
fs.writeFileSync('src/components/header/Header.css', cleanedContent);

console.log('✅ CSS file cleaned!');
console.log(`📊 Removed ${lines.length - cleanedLines.length} duplicate closing braces`);

// Verify the result
const newCssContent = fs.readFileSync('src/components/header/Header.css', 'utf8');
const openBraces = (newCssContent.match(/\{/g) || []).length;
const closeBraces = (newCssContent.match(/\}/g) || []).length;

console.log(`🔍 Final count: ${openBraces} open, ${closeBraces} close`);
console.log(`🎯 Balanced: ${openBraces === closeBraces ? '✅ YES' : '❌ NO'}`);
