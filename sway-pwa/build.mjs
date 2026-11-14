/**
 * Builds the installable PWA.
 *
 * 1. Exports the Expo app for web (same React Native components as the Android
 *    build, so the UI is pixel-identical).
 * 2. Copies the PWA shell (manifest, service worker, icons, launch screens).
 * 3. Injects the iOS / PWA head tags and service worker registration.
 *
 * Output: ./dist - a static site ready for any HTTPS host.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SPLASH_SCREENS } from './generate-assets.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../sway');
const dist = path.resolve(here, 'dist');
const publicDir = path.resolve(here, 'public');

const THEME_COLOR = '#9700cd';
const BACKGROUND = '#f9f9f9';

function copyDir(from, to, skip = new Set()) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target, skip);
    else fs.copyFileSync(source, target);
  }
}

function startSplashTag(screen) {
  const { width, height, dpr, file } = screen;
  const media = `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${dpr})`;
  return `    <link rel="apple-touch-startup-image" media="${media}" href="/splash/${file}" />`;
}

function pwaHead() {
  return [
    `    <!-- PWA / iOS standalone -->`,
    `    <link rel="manifest" href="/manifest.webmanifest" />`,
    `    <meta name="theme-color" content="${THEME_COLOR}" />`,
    `    <meta name="application-name" content="SWAY" />`,
    `    <meta name="apple-mobile-web-app-capable" content="yes" />`,
    `    <meta name="mobile-web-app-capable" content="yes" />`,
    `    <meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
    `    <meta name="apple-mobile-web-app-title" content="SWAY" />`,
    `    <meta name="format-detection" content="telephone=no" />`,
    `    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`,
    `    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />`,
    `    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />`,
    `    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />`,
    ...SPLASH_SCREENS.map(startSplashTag),
    `    <style>`,
    `      html, body, #root { height: 100%; margin: 0; background: ${BACKGROUND}; }`,
    `      body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }`,
    `      /* Keep content below the notch / status bar in standalone mode */`,
    `      #root { padding: 0; }`,
    `    </style>`,
  ].join('\n');
}

const swRegistration = `
    <script>
      if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function (error) {
            console.warn('Service worker registration failed', error);
          });
        });
      }
      // iOS standalone: block accidental pull-to-refresh / rubber banding on the shell
      if (window.navigator.standalone) {
        document.addEventListener('touchmove', function (event) {
          if (event.touches.length > 1) return;
          var node = event.target;
          while (node && node !== document.body) {
            if (node.scrollHeight > node.clientHeight) return;
            node = node.parentNode;
          }
        }, { passive: true });
      }
    </script>
`;

/**
 * Cloudflare Pages never serves files inside a `node_modules` directory, and
 * Expo puts every font there (`assets/node_modules/@expo-google-fonts/...`).
 * Move them to `assets/vendor` and rewrite the references in the bundles.
 */
function relocateVendorAssets() {
  const from = path.join(dist, 'assets', 'node_modules');
  if (!fs.existsSync(from)) return;

  const to = path.join(dist, 'assets', 'vendor');
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);

  const rewrite = (file) => {
    const contents = fs.readFileSync(file, 'utf8');
    if (!contents.includes('assets/node_modules/')) return;
    fs.writeFileSync(file, contents.split('assets/node_modules/').join('assets/vendor/'), 'utf8');
  };

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|html|json|css|map)$/i.test(entry.name)) rewrite(full);
    }
  };
  walk(dist);
}

function patchHtml(html) {
  let out = html;

  // Safe-area aware viewport (required for env(safe-area-inset-*) in standalone)
  out = out.replace(
    /<meta[^>]+name="viewport"[^>]*>/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />'
  );

  if (!/name="viewport"/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (match) => `${match}\n    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />`);
  }

  // Drop tags we re-add ourselves so there are no duplicates
  out = out
    .replace(/<link[^>]+rel="manifest"[^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel="apple-touch-icon"[^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel="icon"[^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name="theme-color"[^>]*>\s*/gi, '');

  out = out.replace(/<\/head>/i, `${pwaHead()}\n  </head>`);
  out = out.replace(/<\/body>/i, `${swRegistration}  </body>`);

  return out;
}

function main() {
  if (!fs.existsSync(publicDir)) {
    throw new Error('public/ folder is missing');
  }

  console.log('Exporting the Expo app for web...');
  fs.rmSync(dist, { recursive: true, force: true });
  execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', dist], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, CI: '1' },
  });

  console.log('Copying the PWA shell...');
  copyDir(publicDir, dist);

  console.log('Relocating fonts out of node_modules (Cloudflare Pages blocks it)...');
  relocateVendorAssets();

  const indexPath = path.join(dist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('Expo export did not produce dist/index.html');
  }

  console.log('Injecting iOS / PWA metadata...');
  fs.writeFileSync(indexPath, patchHtml(fs.readFileSync(indexPath, 'utf8')), 'utf8');

  // Expo Router may emit per-route HTML files; keep the shell tags everywhere
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '_expo' || entry.name === 'icons' || entry.name === 'splash') continue;
        walk(full);
      } else if (entry.name.endsWith('.html') && full !== indexPath) {
        fs.writeFileSync(full, patchHtml(fs.readFileSync(full, 'utf8')), 'utf8');
      }
    }
  };
  walk(dist);

  console.log(`\nPWA ready: ${dist}`);
  console.log('Host it over HTTPS, then on iPhone: Safari > Share > Add to Home Screen.');
}

main();
