/**
 * Generates the app icon, adaptive icon, splash art, notification icon and
 * favicon from the SWAY mark. Run with: node scripts/generate-assets.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const PRIMARY = '#9700cd';
const ACCENT = '#c1f100';
const WHITE = '#ffffff';

/** The "S" mark, drawn as one round-capped stroke, positioned on a 1024 grid. */
function mark({ stroke = WHITE, scale = 1, background = null }) {
  return `
    <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
      <path d="M700 322 C700 234 610 188 512 188 C408 188 328 240 328 332
               C328 426 410 464 512 490 C616 516 700 554 700 650
               C700 750 604 804 504 804 C402 804 320 758 314 666"
            fill="none" stroke="${stroke}" stroke-width="92" stroke-linecap="round"/>
      <circle cx="772" cy="240" r="44" fill="${ACCENT}"/>
    </g>`;
}

function svg({ size = 1024, background = PRIMARY, stroke = WHITE, scale = 1, rounded = 0 }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    ${background ? `<rect width="1024" height="1024" rx="${rounded}" fill="${background}"/>` : ''}
    ${mark({ stroke, scale })}
  </svg>`);
}

const out = 'assets';
await mkdir(out, { recursive: true });

// App icon (iOS + fallback Android): purple field, white mark
await sharp(svg({})).png().resize(1024, 1024).toFile(`${out}/icon.png`);

// Adaptive foreground: transparent, mark inside the 66% safe zone
await sharp(svg({ background: null, scale: 0.72 })).png().resize(1024, 1024).toFile(`${out}/adaptive-icon.png`);

// Splash art: white mark on transparent (the splash background is purple)
await sharp(svg({ background: null, stroke: WHITE, scale: 0.9 })).png().resize(512, 512).toFile(`${out}/splash-icon.png`);

// Notification icon: flat white silhouette on transparent
await sharp(svg({ background: null, stroke: WHITE, scale: 0.8 }))
  .png()
  .resize(96, 96)
  .toFile(`${out}/notification-icon.png`);

// Web favicon
await sharp(svg({ rounded: 180 })).png().resize(48, 48).toFile(`${out}/favicon.png`);

console.log('Generated icon.png, adaptive-icon.png, splash-icon.png, notification-icon.png, favicon.png');
