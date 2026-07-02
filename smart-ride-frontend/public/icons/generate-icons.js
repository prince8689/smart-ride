const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SVG_PATH = path.join(__dirname, '../logo.svg');
const OUT_DIR = __dirname;
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error('logo.svg not found in public folder!');
    process.exit(1);
  }

  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SVG_PATH)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  
  console.log('All PWA icons generated successfully!');
}

generate().catch(console.error);
