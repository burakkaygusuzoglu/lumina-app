#!/usr/bin/env node
/**
 * generate-icons.cjs  — Lumina PNG icon generator
 *
 * Converts  public/icons/icon.svg  →  all required PNG sizes for
 *   • PWA (192 × 192, 512 × 512)
 *   • iOS home-screen / splash (180 × 180, 167 × 167, 152 × 152, 120 × 120)
 *   • Capacitor / Android (192 × 192 already covered)
 *
 * Usage:
 *   node scripts/generate-icons.cjs
 */

const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');

const SRC  = path.resolve(__dirname, '../public/icons/icon.svg');
const DEST = path.resolve(__dirname, '../public/icons');

const SIZES = [1024, 512, 192, 180, 167, 152, 120, 96, 72, 48];

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('❌  Source SVG not found:', SRC);
    process.exit(1);
  }

  fs.mkdirSync(DEST, { recursive: true });

  for (const size of SIZES) {
    const outFile = path.join(DEST, `icon-${size}.png`);
    await sharp(SRC)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outFile);
    console.log(`✅  ${size}×${size}  →  ${outFile}`);
  }

  // also output a favicon-32 and favicon-16
  for (const size of [32, 16]) {
    const outFile = path.join(DEST, `favicon-${size}.png`);
    await sharp(SRC)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outFile);
    console.log(`✅  ${size}×${size}  →  ${outFile}`);
  }

  console.log('\n🎉  All icons generated successfully!');
}

main().catch((err) => {
  console.error('❌  Icon generation failed:', err);
  process.exit(1);
});
