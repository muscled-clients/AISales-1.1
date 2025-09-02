#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update in public folder
const publicFiles = [
  'electron.js',
  'deepgramService.js',
  'audioManager.js',
  'dualAudioCapture.js',
  'windowsAudioCapture.js'
];

let totalReplacements = 0;
let fileCount = 0;

publicFiles.forEach(filename => {
  const filePath = path.join(__dirname, '..', 'public', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filename} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let replacements = 0;

  // Add logger import at the top if not already present
  if (!content.includes("require('./logger')") && !content.includes('require("./logger")')) {
    // Find the first require statement or add at the beginning
    const requireMatch = content.match(/const\s+\w+\s*=\s*require\([^)]+\);/);
    if (requireMatch) {
      content = content.replace(requireMatch[0], `const logger = require('./logger');\n${requireMatch[0]}`);
    } else {
      content = `const logger = require('./logger');\n${content}`;
    }
  }

  // Replace console.log with logger.debug
  const logMatches = content.match(/console\.log\([^)]+\)/g);
  if (logMatches) {
    logMatches.forEach(() => {
      content = content.replace(/console\.log\(/, 'logger.debug(');
      replacements++;
    });
  }

  // Replace console.error with logger.error
  const errorMatches = content.match(/console\.error\([^)]+\)/g);
  if (errorMatches) {
    errorMatches.forEach(() => {
      content = content.replace(/console\.error\(/, 'logger.error(');
      replacements++;
    });
  }

  // Replace console.warn with logger.warn
  const warnMatches = content.match(/console\.warn\([^)]+\)/g);
  if (warnMatches) {
    warnMatches.forEach(() => {
      content = content.replace(/console\.warn\(/, 'logger.warn(');
      replacements++;
    });
  }

  if (replacements > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filename}: Replaced ${replacements} console statements`);
    totalReplacements += replacements;
    fileCount++;
  } else {
    console.log(`⏭️  ${filename}: No console statements found`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   - Files updated: ${fileCount}`);
console.log(`   - Total replacements: ${totalReplacements}`);
console.log(`\n✨ Public folder console statements have been replaced with logger!`);