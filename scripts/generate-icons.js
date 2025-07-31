/**
 * Icon Generator Script for Boxing Timer PWA
 * 
 * Generates placeholder icons for PWA requirements.
 * In production, replace these with professionally designed icons.
 */

const fs = require('fs');
const path = require('path');

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed for PWA
const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];

/**
 * Generate a simple SVG icon
 */
function generateSvgIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b91c1c;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad${size})" rx="${size * 0.15}" />
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${size * 0.6}" fill="white">🥊</text>
</svg>`;
}

/**
 * Create icon files
 */
sizes.forEach(size => {
  const svgContent = generateSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Created: ${filename}`);
});

// Create a simple favicon.ico placeholder
const faviconSvg = generateSvgIcon(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
console.log('Created: favicon.svg');

// Create screenshots directory and placeholder files
const screenshotsDir = path.join(__dirname, '../public/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Generate placeholder screenshot SVGs
const screenshotSpecs = [
  { name: 'timer-work.svg', width: 540, height: 720, label: 'Work Period' },
  { name: 'timer-rest.svg', width: 540, height: 720, label: 'Rest Period' },
  { name: 'timer-desktop.svg', width: 1280, height: 720, label: 'Desktop View' }
];

screenshotSpecs.forEach(spec => {
  const svg = `<svg width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${spec.width}" height="${spec.height}" fill="#0f172a" />
  <text x="50%" y="40%" text-anchor="middle" font-size="48" fill="#dc2626" font-weight="bold">Boxing Timer</text>
  <text x="50%" y="50%" text-anchor="middle" font-size="24" fill="#94a3b8">${spec.label}</text>
  <text x="50%" y="60%" text-anchor="middle" font-size="72" fill="white">🥊</text>
</svg>`;
  
  fs.writeFileSync(path.join(screenshotsDir, spec.name), svg);
  console.log(`Created screenshot: ${spec.name}`);
});

console.log('\nIcon generation complete!');
console.log('Note: These are placeholder icons. For production, use professionally designed PNG icons.');