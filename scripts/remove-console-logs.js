#!/usr/bin/env node

/**
 * Script to replace all console.log/error/warn statements with logger
 * Run with: node scripts/remove-console-logs.js
 */

const fs = require('fs');
const path = require('path');

// Files to process
const SRC_DIR = path.join(__dirname, '..', 'src');
const filesToProcess = [];
const filesToSkip = [
  'logger.ts',
  'logger.js',
  '.test.',
  '.spec.',
  'setupTests'
];

// Stats
let totalReplacements = 0;
let filesModified = 0;
const replacementsByType = {
  log: 0,
  error: 0,
  warn: 0,
  info: 0,
  debug: 0
};

// Find all TypeScript and JavaScript files
function findFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and build directories
      if (!file.includes('node_modules') && file !== 'build') {
        findFiles(fullPath);
      }
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx') || 
                file.endsWith('.js') || file.endsWith('.jsx')) &&
               !filesToSkip.some(skip => file.includes(skip))) {
      filesToProcess.push(fullPath);
    }
  });
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Check if logger is already imported
  const hasLoggerImport = content.includes('from \'../utils/logger\'') ||
                          content.includes('from \'./utils/logger\'') ||
                          content.includes('from \'../../utils/logger\'') ||
                          content.includes('import logger');
  
  // Patterns to replace
  const patterns = [
    // console.log with multiple arguments
    {
      regex: /console\.log\s*\(\s*['"`]([^'"`]*?)['"`]\s*,\s*(.*?)\s*\)/g,
      replacement: 'logger.debug(\'$1\', $2)',
      type: 'log'
    },
    // console.log with single string
    {
      regex: /console\.log\s*\(\s*['"`]([^'"`]*?)['"`]\s*\)/g,
      replacement: 'logger.debug(\'$1\')',
      type: 'log'
    },
    // console.log with template literals
    {
      regex: /console\.log\s*\(\s*`([^`]*?)`\s*\)/g,
      replacement: 'logger.debug(`$1`)',
      type: 'log'
    },
    // console.log with variables
    {
      regex: /console\.log\s*\(\s*([^)]+)\s*\)/g,
      replacement: 'logger.debug(\'Log:\', $1)',
      type: 'log'
    },
    // console.error
    {
      regex: /console\.error\s*\(\s*['"`]([^'"`]*?)['"`]\s*,?\s*(.*?)\s*\)/g,
      replacement: 'logger.error(\'$1\', $2)',
      type: 'error'
    },
    // console.warn
    {
      regex: /console\.warn\s*\(\s*['"`]([^'"`]*?)['"`]\s*,?\s*(.*?)\s*\)/g,
      replacement: 'logger.warn(\'$1\', $2)',
      type: 'warn'
    },
    // console.info
    {
      regex: /console\.info\s*\(\s*['"`]([^'"`]*?)['"`]\s*,?\s*(.*?)\s*\)/g,
      replacement: 'logger.info(\'$1\', $2)',
      type: 'info'
    }
  ];
  
  // Apply replacements
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches) {
      content = content.replace(pattern.regex, pattern.replacement);
      replacementsByType[pattern.type] += matches.length;
      totalReplacements += matches.length;
      modified = true;
    }
  });
  
  // If file was modified and doesn't have logger import, add it
  if (modified && !hasLoggerImport) {
    // Calculate relative path to logger
    const relativePath = path.relative(path.dirname(filePath), 
                                      path.join(SRC_DIR, 'utils', 'logger.ts'));
    const importPath = relativePath.replace(/\\/g, '/').replace('.ts', '');
    
    // Add import at the beginning of the file
    const importStatement = `import logger from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n`;
    
    // Check if file has other imports
    const firstImportMatch = content.match(/^import\s+/m);
    if (firstImportMatch) {
      // Add after first import
      const position = content.indexOf(firstImportMatch[0]);
      content = content.slice(0, position) + importStatement + content.slice(position);
    } else {
      // Add at the beginning
      content = importStatement + '\n' + content;
    }
  }
  
  // Write back if modified
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`✅ Processed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔍 Finding files to process...');
findFiles(SRC_DIR);

console.log(`📝 Found ${filesToProcess.length} files to check`);
console.log('🔄 Processing files...\n');

filesToProcess.forEach(file => {
  processFile(file);
});

// Report results
console.log('\n' + '='.repeat(50));
console.log('✨ Console.log Removal Complete!');
console.log('='.repeat(50));
console.log(`📊 Statistics:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log(`   - console.log → logger.debug: ${replacementsByType.log}`);
console.log(`   - console.error → logger.error: ${replacementsByType.error}`);
console.log(`   - console.warn → logger.warn: ${replacementsByType.warn}`);
console.log(`   - console.info → logger.info: ${replacementsByType.info}`);
console.log('='.repeat(50));

if (totalReplacements > 0) {
  console.log('\n⚠️  Important Notes:');
  console.log('1. Review the changes before committing');
  console.log('2. Some complex console statements may need manual adjustment');
  console.log('3. Logger will only output in development mode');
  console.log('4. Production builds will be silent');
}