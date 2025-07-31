#!/usr/bin/env node

/**
 * PWA Setup Script for Boxing Timer
 * 
 * Sets up and validates PWA features for the Boxing Timer application.
 * Checks requirements, generates missing assets, and validates PWA readiness.
 */

const fs = require('fs');
const path = require('path');

console.log('🥊 Boxing Timer PWA Setup');
console.log('========================\n');

// Check Node.js version
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);

// Project paths
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const iconsDir = path.join(publicDir, 'icons');
const screenshotsDir = path.join(publicDir, 'screenshots');

/**
 * Check if directory exists, create if not
 */
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${path.relative(projectRoot, dir)}`);
  } else {
    console.log(`✅ Directory exists: ${path.relative(projectRoot, dir)}`);
  }
}

/**
 * Check if file exists
 */
function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${path.relative(projectRoot, filePath)}`);
    return true;
  } else {
    console.log(`❌ Missing ${description}: ${path.relative(projectRoot, filePath)}`);
    return false;
  }
}

/**
 * Validate manifest.json
 */
function validateManifest() {
  const manifestPath = path.join(publicDir, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ Missing manifest.json');
    return false;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ Manifest missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log('✅ Manifest.json is valid');
    console.log(`  - Name: ${manifest.name}`);
    console.log(`  - Icons: ${manifest.icons.length} defined`);
    console.log(`  - Display mode: ${manifest.display}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Invalid manifest.json: ${error.message}`);
    return false;
  }
}

/**
 * Check PWA requirements
 */
function checkPWARequirements() {
  console.log('\n📋 Checking PWA Requirements:');
  
  const requirements = [
    { file: path.join(publicDir, 'manifest.json'), desc: 'Web App Manifest' },
    { file: path.join(publicDir, 'sw.js'), desc: 'Service Worker' },
    { file: path.join(publicDir, 'offline.html'), desc: 'Offline page' },
  ];
  
  let allValid = true;
  
  requirements.forEach(req => {
    if (!checkFile(req.file, req.desc)) {
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * Check icon files
 */
function checkIcons() {
  console.log('\n🎨 Checking PWA Icons:');
  
  const requiredSizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
  let allIcons = true;
  
  requiredSizes.forEach(size => {
    const iconPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    if (!checkFile(iconPath, `Icon ${size}x${size}`)) {
      allIcons = false;
    }
  });
  
  return allIcons;
}

/**
 * Check screenshot files
 */
function checkScreenshots() {
  console.log('\n📸 Checking PWA Screenshots:');
  
  const requiredScreenshots = [
    'timer-work.svg',
    'timer-rest.svg',
    'timer-desktop.svg'
  ];
  
  let allScreenshots = true;
  
  requiredScreenshots.forEach(screenshot => {
    const screenshotPath = path.join(screenshotsDir, screenshot);
    if (!checkFile(screenshotPath, `Screenshot ${screenshot}`)) {
      allScreenshots = false;
    }
  });
  
  return allScreenshots;
}

/**
 * Generate HTTPS self-signed certificate info
 */
function showHTTPSInfo() {
  console.log('\n🔒 HTTPS Requirements:');
  console.log('PWA features require HTTPS in production.');
  console.log('For local development, use:');
  console.log('  - https://localhost:3000');
  console.log('  - Or use tools like ngrok for HTTPS tunneling');
  console.log('  - Service workers work on localhost with HTTP');
}

/**
 * Main setup function
 */
function main() {
  // Ensure directories exist
  console.log('📁 Setting up directories:');
  ensureDirectory(iconsDir);
  ensureDirectory(screenshotsDir);
  
  // Check PWA requirements
  const pwaValid = checkPWARequirements();
  const manifestValid = validateManifest();
  const iconsValid = checkIcons();
  const screenshotsValid = checkScreenshots();
  
  // Show HTTPS info
  showHTTPSInfo();
  
  // Summary
  console.log('\n📊 PWA Setup Summary:');
  console.log(`  PWA Files: ${pwaValid ? '✅' : '❌'}`);
  console.log(`  Manifest: ${manifestValid ? '✅' : '❌'}`);
  console.log(`  Icons: ${iconsValid ? '✅' : '❌'}`);
  console.log(`  Screenshots: ${screenshotsValid ? '✅' : '❌'}`);
  
  if (pwaValid && manifestValid && iconsValid && screenshotsValid) {
    console.log('\n🎉 PWA setup is complete! Your Boxing Timer is ready for installation.');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open: https://localhost:3000');
    console.log('  3. Test PWA features in Chrome DevTools > Application > Manifest');
  } else {
    console.log('\n⚠️  Some PWA requirements are missing.');
    console.log('Run: node scripts/generate-icons.js to create missing assets.');
  }
  
  console.log('\n🥊 Happy boxing!');
}

// Run the setup
main();