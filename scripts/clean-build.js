#!/usr/bin/env node

/**
 * Build cleanup script to remove test files and directories from production build
 * This ensures that test files from dependencies don't cause deployment failures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const testPatterns = [
  'test',
  'tests', 
  '__tests__',
  'spec',
  'specs',
  '__mocks__',
  'coverage',
  '.nyc_output'
];

const testFilePatterns = [
  /\.test\.(js|ts|jsx|tsx)$/,
  /\.spec\.(js|ts|jsx|tsx)$/,
  /test\.(js|ts|jsx|tsx)$/,
  /spec\.(js|ts|jsx|tsx)$/
];

/**
 * Recursively remove test directories and files
 */
function cleanTestFiles(dir) {
  if (!fs.existsSync(dir)) return;
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Remove test directories
        if (testPatterns.includes(item.name.toLowerCase())) {
          console.log(`Removing test directory: ${fullPath}`);
          fs.rmSync(fullPath, { recursive: true, force: true });
          continue;
        }
        
        // Recursively clean subdirectories
        cleanTestFiles(fullPath);
      } else {
        // Remove test files
        if (testFilePatterns.some(pattern => pattern.test(item.name))) {
          console.log(`Removing test file: ${fullPath}`);
          fs.rmSync(fullPath, { force: true });
        }
      }
    }
  } catch (error) {
    console.error(`Error cleaning ${dir}:`, error.message);
  }
}

/**
 * Main cleanup process
 */
function main() {
  console.log('🧹 Starting build cleanup...');
  
  // Clean node_modules test files (main cause of the pdf-parse issue)
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('Cleaning test files from node_modules...');
    cleanTestFiles(nodeModulesPath);
  }
  
  // Clean dist directory test files
  const distPath = path.join(projectRoot, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('Cleaning test files from dist...');
    cleanTestFiles(distPath);
  }
  
  console.log('✅ Build cleanup completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}