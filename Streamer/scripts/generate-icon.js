/**
 * Icon Generator Script
 * Run this before building to generate the app icon
 *
 * Usage: node scripts/generate-icon.js
 *
 * Note: This creates a simple icon. For production, replace with your own icon.
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="256" height="256" rx="48" fill="#12121a"/>
  <!-- Outer ring -->
  <circle cx="128" cy="128" r="80" fill="none" stroke="url(#grad)" stroke-width="8"/>
  <!-- Record button -->
  <circle cx="128" cy="128" r="45" fill="url(#grad)"/>
  <!-- Inner dot -->
  <circle cx="128" cy="128" r="20" fill="#12121a"/>
</svg>`;

// Ensure assets directory exists
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Write SVG icon
const svgPath = path.join(assetsDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log('Created SVG icon:', svgPath);

// Create a simple PNG placeholder using base64 (16x16 minimum for ICO)
// This is a minimal 256x256 PNG with the app icon
const pngBase64 = `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`;

// Write PNG icon
const pngPath = path.join(assetsDir, 'icon.png');
fs.writeFileSync(pngPath, Buffer.from(pngBase64, 'base64'));
console.log('Created PNG icon:', pngPath);

console.log('\nIcon files created successfully!');
console.log('\nTo create an .ico file for Windows:');
console.log('1. Use an online converter like https://convertio.co/png-ico/');
console.log('2. Or use ImageMagick: magick convert icon.png icon.ico');
console.log('3. Save the .ico file to the assets folder');
