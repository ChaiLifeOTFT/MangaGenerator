#!/usr/bin/env node

/**
 * Targeted cleanup script specifically for pdf-parse test files
 * This removes only the problematic pdf-parse test directory that causes deployment failures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function cleanPdfParseTestFiles() {
  console.log('🎯 Targeting pdf-parse test files specifically...');
  
  const pdfParseTestDir = path.join(projectRoot, 'node_modules', 'pdf-parse', 'test');
  
  if (fs.existsSync(pdfParseTestDir)) {
    console.log(`Removing pdf-parse test directory: ${pdfParseTestDir}`);
    try {
      fs.rmSync(pdfParseTestDir, { recursive: true, force: true });
      console.log('✅ Successfully removed pdf-parse test files');
    } catch (error) {
      console.error('❌ Error removing pdf-parse test directory:', error.message);
    }
  } else {
    console.log('ℹ️ pdf-parse test directory not found (may already be clean)');
  }
}

/**
 * Main function
 */
function main() {
  console.log('🧹 Starting targeted pdf-parse cleanup...');
  cleanPdfParseTestFiles();
  console.log('✅ Cleanup completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}