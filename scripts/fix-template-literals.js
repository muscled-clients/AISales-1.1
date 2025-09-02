#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

let totalFixes = 0;
let filesFixed = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Fix logger calls that use single quotes but contain template literals
  // Pattern: logger.method('...${...}...')
  const loggerPattern = /logger\.(debug|info|warn|error)\('([^']*\$\{[^}]+\}[^']*)'\)/g;
  
  content = content.replace(loggerPattern, (match, method, message) => {
    totalFixes++;
    return `logger.${method}(\`${message}\`)`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    filesFixed++;
    console.log(`✅ Fixed ${path.basename(filePath)}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   - Files fixed: ${filesFixed}`);
console.log(`   - Total template literals fixed: ${totalFixes}`);
console.log(`\n✨ Template literals have been fixed!`);