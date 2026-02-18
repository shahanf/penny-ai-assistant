import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'public', 'icons');
mkdirSync(ICONS_DIR, { recursive: true });

// Regular coin icon SVG (coin fills the full canvas)
function regularIconSVG(size) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 1;
  const borderR = outerR;
  const innerR = outerR - size * 0.04;
  const fontSize = size * 0.55;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="coinGrad" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    <radialGradient id="borderGrad" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </radialGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${size * 0.01}" stdDeviation="${size * 0.01}" flood-color="#78350f" flood-opacity="0.5"/>
    </filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${borderR}" fill="url(#borderGrad)"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="url(#coinGrad)"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR - size * 0.02}" fill="none" stroke="#fde68a" stroke-opacity="0.35" stroke-width="${size * 0.01}"/>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-weight="bold"
        font-size="${fontSize}px" fill="#fffbeb" filter="url(#textShadow)"
        dy="${size * 0.02}">&#162;</text>
</svg>`;
}

// Maskable icon SVG (coin at ~60% on solid gold background)
function maskableIconSVG(size) {
  const cx = size / 2;
  const cy = size / 2;
  const coinR = size * 0.30;
  const borderR = coinR;
  const innerR = coinR - size * 0.02;
  const fontSize = size * 0.32;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="coinGrad" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    <radialGradient id="borderGrad" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </radialGradient>
    <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.008}" stdDeviation="${size * 0.015}" flood-color="#78350f" flood-opacity="0.4"/>
    </filter>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${size * 0.005}" stdDeviation="${size * 0.005}" flood-color="#78350f" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="#f59e0b"/>
  <g filter="url(#coinShadow)">
    <circle cx="${cx}" cy="${cy}" r="${borderR}" fill="url(#borderGrad)"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="url(#coinGrad)"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR - size * 0.01}" fill="none" stroke="#fde68a" stroke-opacity="0.35" stroke-width="${size * 0.006}"/>
  </g>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-weight="bold"
        font-size="${fontSize}px" fill="#fffbeb" filter="url(#textShadow)"
        dy="${size * 0.012}">&#162;</text>
</svg>`;
}

// Generate all icons
async function generate() {
  const icons = [
    { name: 'icon-192.png',          size: 192, type: 'regular' },
    { name: 'icon-512.png',          size: 512, type: 'regular' },
    { name: 'icon-512-maskable.png', size: 512, type: 'maskable' },
    { name: 'apple-touch-icon.png',  size: 180, type: 'regular' },
  ];

  for (const icon of icons) {
    const svg = icon.type === 'maskable'
      ? maskableIconSVG(icon.size)
      : regularIconSVG(icon.size);

    const svgBuffer = Buffer.from(svg);
    const outPath = join(ICONS_DIR, icon.name);

    await sharp(svgBuffer, { density: 150 })
      .resize(icon.size, icon.size)
      .png()
      .toFile(outPath);

    console.log(`Created: ${outPath}  (${icon.size}x${icon.size}, ${icon.type})`);
  }

  console.log('\nAll icons generated successfully.');
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
