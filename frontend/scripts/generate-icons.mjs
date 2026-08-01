/**
 * PWA icon + screenshot generator.
 * Rasterizes the StudyBridge brand SVGs into all required PNG sizes.
 * Run:  node scripts/generate-icons.mjs   (from frontend/)
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS = path.join(PUBLIC, 'icons');

const LOGO = path.join(PUBLIC, 'logo.svg');
const MASKABLE = path.join(PUBLIC, 'logo-maskable.svg');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

await mkdir(ICONS, { recursive: true });

// 1. Standard icons (all required sizes)
for (const size of SIZES) {
  await sharp(LOGO)
    .resize(size, size)
    .png()
    .toFile(path.join(ICONS, `icon-${size}x${size}.png`));
  console.log(`icon-${size}x${size}.png`);
}

// 2. Maskable icons (safe-zone artwork, full-bleed background)
await sharp(MASKABLE).resize(192, 192).png().toFile(path.join(ICONS, 'maskable-192x192.png'));
await sharp(MASKABLE).resize(512, 512).png().toFile(path.join(ICONS, 'maskable-512x512.png'));
console.log('maskable-192x192.png / maskable-512x512.png');

// 3. Apple touch icon (180, opaque)
await sharp(LOGO).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
console.log('apple-touch-icon.png');

// 4. Favicons
await sharp(LOGO).resize(32, 32).png().toFile(path.join(PUBLIC, 'favicon-32x32.png'));
await sharp(LOGO).resize(16, 16).png().toFile(path.join(PUBLIC, 'favicon-16x16.png'));
await sharp(LOGO).resize(32, 32).toFile(path.join(PUBLIC, 'favicon.ico'));
console.log('favicon-32x32.png / favicon-16x16.png / favicon.ico');

// 5. Manifest screenshots are real captures of the live site (Chrome headless),
//    committed as PNGs in public/screenshots/ — not generated here.

console.log('\nAll PWA assets generated.');
