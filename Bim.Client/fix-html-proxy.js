#!/usr/bin/env node

/**
 * HTML Proxy Fix Script for Vite
 * This script addresses the "No matching HTML proxy module found" error
 * by clearing Vite cache and ensuring proper module resolution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

console.log(`${colors.cyan}=================================================`);
console.log(`     HTML PROXY MODULE FIX - BIMRECOVERY CLIENT`);
console.log(`=================================================\n${colors.reset}`);

// Get project root (assuming script is run from project root)
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const viteCachePath = path.join(projectRoot, 'node_modules', '.vite');

function clearViteCache() {
  console.log(`${colors.yellow}Checking for Vite cache...${colors.reset}`);
  
  if (fs.existsSync(viteCachePath)) {
    console.log(`${colors.green}Found Vite cache. Clearing...${colors.reset}`);
    try {
      fs.rmSync(viteCachePath, { recursive: true, force: true });
      console.log(`${colors.green}✓ Vite cache cleared successfully${colors.reset}`);
    } catch (err) {
      console.error(`${colors.red}❌ Failed to clear Vite cache:${colors.reset}`, err.message);
    }
  } else {
    console.log(`${colors.yellow}No Vite cache found. Skipping...${colors.reset}`);
  }
}

function checkNodeModules() {
  console.log(`${colors.yellow}Checking node_modules integrity...${colors.reset}`);
  
  const vitePluginReact = path.join(nodeModulesPath, '@vitejs', 'plugin-react');
  const vitePackage = path.join(nodeModulesPath, 'vite');
  
  if (!fs.existsSync(vitePluginReact) || !fs.existsSync(vitePackage)) {
    console.log(`${colors.yellow}Missing essential Vite dependencies. Reinstalling...${colors.reset}`);
    return false;
  }
  
  return true;
}

function reinstallDependencies() {
  console.log(`${colors.yellow}Reinstalling dependencies...${colors.reset}`);
  
  try {
    execSync('npm ci', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Dependencies reinstalled successfully${colors.reset}`);
    return true;
  } catch (err) {
    console.log(`${colors.red}❌ Failed to reinstall dependencies${colors.reset}`);
    console.log(`${colors.yellow}Trying regular npm install...${colors.reset}`);
    
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log(`${colors.green}✓ Dependencies installed successfully${colors.reset}`);
      return true;
    } catch (err) {
      console.error(`${colors.red}❌ Failed to install dependencies:${colors.reset}`, err.message);
      return false;
    }
  }
}

function fixViteConfig() {
  const viteConfigPath = path.join(projectRoot, 'vite.config.js');
  
  console.log(`${colors.yellow}Checking Vite configuration...${colors.reset}`);
  
  if (!fs.existsSync(viteConfigPath)) {
    console.error(`${colors.red}❌ vite.config.js not found!${colors.reset}`);
    return false;
  }
  
  try {
    let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Check if HTML proxy is already configured
    if (viteConfig.includes('fs: {') && viteConfig.includes('strict: false')) {
      console.log(`${colors.green}✓ Vite config already has proper HTML proxy settings${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Updating Vite configuration...${colors.reset}`);
      
      // Backup original config
      fs.writeFileSync(`${viteConfigPath}.backup`, viteConfig);
      console.log(`${colors.green}✓ Created backup at ${viteConfigPath}.backup${colors.reset}`);
      
      // Simple regex approach - this might need adjustments based on your config structure
      if (viteConfig.includes('server: {')) {
        viteConfig = viteConfig.replace(/server: {([^}]*)}/s, 
          `server: {$1  fs: {
    strict: false,
    allow: ['..']
  },
  hmr: {
    protocol: 'ws',
    host: 'localhost'
  }
}`);
      }
      
      fs.writeFileSync(viteConfigPath, viteConfig);
      console.log(`${colors.green}✓ Updated Vite configuration${colors.reset}`);
    }
    
    return true;
  } catch (err) {
    console.error(`${colors.red}❌ Failed to update Vite config:${colors.reset}`, err.message);
    return false;
  }
}

function createStartScript() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`${colors.red}❌ package.json not found!${colors.reset}`);
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Create a restart script
    const restartScript = {
      "clean:restart": "rimraf node_modules/.vite && npm run dev"
    };
    
    // Update package.json
    packageJson.scripts = { ...packageJson.scripts, ...restartScript };
    
    // Add rimraf as a dev dependency if it doesn't exist
    if (!packageJson.devDependencies || !packageJson.devDependencies.rimraf) {
      packageJson.devDependencies = { 
        ...packageJson.devDependencies, 
        "rimraf": "^5.0.0" 
      };
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`${colors.green}✓ Added clean:restart script to package.json${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}❌ Failed to update package.json:${colors.reset}`, err.message);
  }
}

function createRestartBatch() {
  const batchPath = path.join(projectRoot, 'restart-vite.bat');
  const batchContent = `@echo off
echo Clearing Vite cache...
rimraf node_modules\\.vite
echo Starting development server...
npm run dev
`;

  try {
    fs.writeFileSync(batchPath, batchContent);
    console.log(`${colors.green}✓ Created restart-vite.bat script${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}❌ Failed to create batch file:${colors.reset}`, err.message);
  }
}

async function runFix() {
  console.log(`${colors.blue}Starting fix process...${colors.reset}`);
  
  // Step 1: Clear Vite cache
  clearViteCache();
  
  // Step 2: Check node_modules
  const modulesOk = checkNodeModules();
  
  // Step 3: Reinstall if needed
  if (!modulesOk) {
    await new Promise((resolve) => {
      rl.question(`${colors.yellow}Would you like to reinstall dependencies? (y/n) ${colors.reset}`, (answer) => {
        if (answer.toLowerCase() === 'y') {
          reinstallDependencies();
        }
        resolve();
      });
    });
  }
  
  // Step 4: Fix Vite config
  fixViteConfig();
  
  // Step 5: Create helper scripts
  createStartScript();
  createRestartBatch();
  
  console.log(`\n${colors.cyan}=================================================`);
  console.log(`                  FIX COMPLETE`);
  console.log(`=================================================\n${colors.reset}`);
  
  console.log(`${colors.green}To restart the development server:${colors.reset}`);
  console.log(`1. Run: ${colors.yellow}npm run clean:restart${colors.reset}`);
  console.log(`2. Or use: ${colors.yellow}restart-vite.bat${colors.reset}`);
  
  console.log(`\n${colors.blue}If issues persist, try the following manual steps:${colors.reset}`);
  console.log(`1. Stop all running Node.js processes`);
  console.log(`2. Delete the node_modules folder`);
  console.log(`3. Run ${colors.yellow}npm install${colors.reset}`);
  console.log(`4. Run ${colors.yellow}npm run dev${colors.reset}`);
  
  rl.close();
}

runFix();
