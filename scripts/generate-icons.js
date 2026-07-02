const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c5ce7"/>
      <stop offset="100%" stop-color="#302b63"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <text x="256" y="300" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="200" font-weight="700" fill="#ffffff">CP</text>
</svg>`;

async function writePng(size, filename) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, filename));
}

async function run() {
  await writePng(512, 'logo512.png');
  await writePng(192, 'logo192.png');
  await writePng(32, 'favicon.png');
  await sharp(Buffer.from(svg)).resize(32, 32).toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Created Carlynve POS icons in public/');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
