// Find consecutive closing braces
import fs from 'fs';

const cssContent = fs.readFileSync('src/components/header/Header.css', 'utf8');
const lines = cssContent.split('\n');

console.log('🔍 Finding consecutive closing braces:');

lines.forEach((line, index) => {
  const trimmedLine = line.trim();
  if (trimmedLine === '}' && index > 0) {
    const prevLine = lines[index - 1].trim();
    if (prevLine === '}') {
      console.log(`❌ Line ${index + 1}: Consecutive closing brace`);
      console.log(`   Previous line ${index}: "${prevLine}"`);
      console.log(`   Current line ${index + 1}: "${trimmedLine}"`);
      console.log(`   Context before:`);
      for (let i = Math.max(0, index - 3); i < index; i++) {
        console.log(`     ${i + 1}: ${lines[i]}`);
      }
      console.log(`   Context after:`);
      for (let i = index; i < Math.min(lines.length, index + 3); i++) {
        console.log(`     ${i + 1}: ${lines[i]}`);
      }
      console.log('   ---');
    }
  }
});

console.log('✅ Analysis complete');
