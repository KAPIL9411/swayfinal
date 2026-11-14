# SWAY — website

Marketing site for SWAY: what the app is, how it works, safety, install instructions
and the download buttons for Android (APK) and iPhone (PWA).

Plain HTML, CSS and ~70 lines of JS. No build step, no framework, no CDN calls —
the brand fonts are bundled locally, so the page renders identically offline.

## Structure

```
sway-site/
  index.html      all content and sections
  styles.css      design system, layout, responsive rules
  main.js         nav state, mobile menu, scroll reveal
  assets/
    fonts/        Anybody, Hanken Grotesk, JetBrains Mono (subset used by the app)
    icon.png      app icon (also used as apple-touch-icon)
    favicon.png
```

## Download links

Both are plain anchors in `index.html`; change the `href` when the build moves.

| Button | Current target |
| --- | --- |
| Download for Android | `https://expo.dev/accounts/fixyes/projects/sway-campus/builds` (latest EAS build) |
| Install on iPhone | `https://sway.pages.dev` (the PWA — Safari → Add to Home Screen) |

Once the APK is hosted somewhere public (R2, Pages, your own domain), replace the
`data-download="android"` anchors with that direct `.apk` URL. There are three of
them: hero, install section, final CTA.

## Preview locally

```bash
cd sway-site
npx --yes serve . -l 8083
```

## Deploy

Any static host works. Cloudflare Pages:

```bash
npx wrangler pages deploy sway-site --project-name sway-site
```

The site needs no server, no redirects and no runtime environment variables.

## Editing notes

- Colours, type and spacing live in `:root` at the top of `styles.css`.
- Sections are self-contained blocks in `index.html`: hero → marquee → features →
  how it works → safety → install → FAQ → final CTA → footer.
- Numbers and claims on the page are deliberately real (no invented user counts).
  Keep it that way when editing copy.
