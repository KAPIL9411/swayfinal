/**
 * Generates the PWA icon set and iOS launch screens from the app's brand icon.
 * Run once (or after the brand icon changes): `npm run assets`
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

// Reuse the sharp install that already ships with the Expo app
const sharp = require(path.resolve(here, '../sway/node_modules/sharp'));

const SOURCE = path.resolve(here, '../sway/assets/icon.png');
const ICONS = path.resolve(here, 'public/icons');
const SPLASH = path.resolve(here, 'public/splash');

const BRAND = '#9700cd';

// Keep in sync with build.mjs
export const SPLASH_SCREENS = [
  { file: 'splash-1125x2436.png', width: 375, height: 812, dpr: 3 },
  { file: 'splash-1170x2532.png', width: 390, height: 844, dpr: 3 },
  { file: 'splash-1179x2556.png', width: 393, height: 852, dpr: 3 },
  { file: 'splash-1284x2778.png', width: 428, height: 926, dpr: 3 },
  { file: 'splash-1290x2796.png', width: 430, height: 932, dpr: 3 },
  { file: 'splash-1242x2688.png', width: 414, height: 896, dpr: 3 },
  { file: 'splash-828x1792.png', width: 414, height: 896, dpr: 2 },
  { file: 'splash-750x1334.png', width: 375, height: 667, dpr: 2 },
  { file: 'splash-1668x2388.png', width: 834, height: 1194, dpr: 2 },
  { file: 'splash-2048x2732.png', width: 1024, height: 1366, dpr: 2 },
];

async function main() {
  fs.mkdirSync(ICONS, { recursive: true });
  fs.mkdirSync(SPLASH, { recursive: true });

  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Brand icon not found at ${SOURCE}`);
  }

  // Square app icons
  await sharp(SOURCE).resize(180, 180, { fit: 'cover' }).png().toFile(path.join(ICONS, 'apple-touch-icon.png'));
  await sharp(SOURCE).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(ICONS, 'icon-192.png'));
  await sharp(SOURCE).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(ICONS, 'icon-512.png'));

  // Maskable icon: brand background with the logo inside the safe circle
  const maskableLogo = await sharp(SOURCE).resize(360, 360, { fit: 'cover' }).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BRAND },
  })
    .composite([{ input: maskableLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(ICONS, 'icon-512-maskable.png'));

  await sharp(SOURCE).resize(32, 32, { fit: 'cover' }).png().toFile(path.join(ICONS, 'favicon-32.png'));

  // iOS launch screens: brand field with the logo centred
  for (const screen of SPLASH_SCREENS) {
    const pixelWidth = screen.width * screen.dpr;
    const pixelHeight = screen.height * screen.dpr;
    const logoSize = Math.round(Math.min(pixelWidth, pixelHeight) * 0.26);

    const logo = await sharp(SOURCE).resize(logoSize, logoSize, { fit: 'cover' }).png().toBuffer();

    await sharp({
      create: { width: pixelWidth, height: pixelHeight, channels: 4, background: BRAND },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(path.join(SPLASH, screen.file));
  }

  console.log(`Icons written to ${ICONS}`);
  console.log(`Launch screens written to ${SPLASH}`);
}

// Only run when called directly (`npm run assets`), not when imported by build.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
