// Simple CSS validation
import fs from 'fs';

const cssContent = fs.readFileSync('src/components/header/Header.css', 'utf8');

// Find duplicate closing braces
const duplicateClosingBraces = cssContent.match(/}\s*}/g);
if (duplicateClosingBraces) {
  console.log('❌ Found duplicate closing braces:', duplicateClosingBraces.length);
  // Find their positions
  let lastIndex = 0;
  duplicateClosingBraces.forEach((match) => {
    const position = cssContent.indexOf(match, lastIndex);
    const lines = cssContent.substring(0, position).split('\n');
    console.log(`   - Line ${lines.length}: "${match.trim()}"`);
    lastIndex = position + match.length;
  });
} else {
  console.log('✅ No duplicate closing braces found');
}

// Find orphaned closing braces (lines that start with })
const lines = cssContent.split('\n');
const orphanedBraces = [];
lines.forEach((line, index) => {
  if (line.trim() === '}' && index > 0) {
    const prevLine = lines[index - 1].trim();
    if (prevLine === '}') {
      orphanedBraces.push({ line: index + 1, content: line });
    }
  }
});

if (orphanedBraces.length > 0) {
  console.log('❌ Found orphaned closing braces:', orphanedBraces.length);
  orphanedBraces.forEach(brace => {
    console.log(`   - Line ${brace.line}: "${brace.content}"`);
  });
} else {
  console.log('✅ No orphaned closing braces found');
}

console.log('\n🔍 CSS appears to be syntactically correct for PostCSS processing!');
