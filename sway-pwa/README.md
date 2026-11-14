# SWAY PWA (iOS home screen app)

An installable Progressive Web App build of SWAY for iPhone/iPad. It runs the
**same React Native screens** as the Android app (Expo web export + the PWA
shell here), so the UI, fonts, tab bar and flows are identical.

iPhone users open the URL in **Safari → Share → Add to Home Screen**. The app
then launches full screen, without browser chrome, and keeps the app shell cached
so it opens instantly (and offline).

## Layout

```
sway-pwa/
  public/
    manifest.webmanifest   app name, colours, icons, standalone display
    sw.js                  service worker (caches the shell, never the API)
    icons/                 generated app icons (192, 512, maskable, apple-touch)
    splash/                generated iOS launch screens (10 device sizes)
    _redirects             SPA fallback for Cloudflare Pages
  generate-assets.mjs      regenerates icons + launch screens from the app icon
  build.mjs                exports ../sway to web and injects the PWA shell
  dist/                    build output - this is what you host
```

The app source stays in `../sway`. This folder only holds the iOS/PWA packaging,
so there is a single codebase to maintain - any change to the Android app shows
up in the PWA on the next build.

## Build

```bash
cd sway-pwa
npm run assets    # only when the brand icon changes
npm run build
```

`build.mjs` runs `expo export --platform web` in `../sway`, copies the shell into
`dist/`, then rewrites `dist/index.html` with:

- `viewport-fit=cover` (so `env(safe-area-inset-*)` works in standalone mode)
- `apple-mobile-web-app-capable` / status bar / title meta tags
- `apple-touch-icon` and `apple-touch-startup-image` per device size
- `theme-color` (`#9700cd`) and the web manifest link
- service worker registration (HTTPS only)

The API URL is baked from `../sway/.env` (`EXPO_PUBLIC_API_URL`).

## Host it

The PWA must be served over **HTTPS** - iOS will not install it from plain HTTP.
`dist/` is a static site, so anything works:

```bash
# local check
npm run serve            # http://localhost:8082

# Cloudflare Pages (free, HTTPS)
npx wrangler pages deploy dist --project-name sway
```

Any host (Vercel, Netlify, GitHub Pages, S3) works; just make sure unknown paths
fall back to `/index.html` so deep links like `/discover` load the app.

## Install on iPhone

1. Open the https URL in **Safari** (not Chrome - only Safari can install PWAs).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch SWAY from the home screen: full-screen, own icon, own splash screen.

## Limitations vs the native app

- No push notifications on iOS PWAs (the app does not depend on them).
- Session is stored in `localStorage` instead of the Keychain; signing out or
  clearing Safari data signs the user out.
- Camera/photo upload prompts for permission per iOS Safari rules.
