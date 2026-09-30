# FileFlowHQ Chrome Extension: Plan

Goal: ship the existing React app as a Manifest V3 Chrome extension, reusing the
current codebase and tools. Work is split into small steps; each ends with
something that can be loaded and checked in `chrome://extensions`.

## Decisions to make first

| # | Question | Options | Default |
|---|---|---|---|
| 1 | UI surface | Popup / Side panel / Full tab | Side panel (room for file tools) |
| 2 | Backend-dependent features (PDF to Word, confirmation email, contact form) | Keep, calling the hosted API / Hide in extension | Keep, call hosted API |
| 3 | Email gate / payment flow | Keep / Drop in extension | Check Web Store policy, then decide |
| 4 | Context-menu integration (right-click image/PDF) | Include / Later | Later |
| 5 | URL shortener backend | Own service / Third-party API | **Own service (decided)** |

## What already helps

- Nearly all tools run client-side (canvas, `pdf-lib`, `pdfjs-dist`, `jspdf`,
  `mammoth`, `docx`), so they work offline inside an extension.
- `src/main.jsx` already switches to `HashRouter` for Capacitor; extension pages
  need the same.
- `src/utils/platform.js` already centralises per-platform behaviour
  (`saveBlob`, `isNative`).

## What has to change

1. **Routing**: extension pages load from `chrome-extension://`, so use
   `HashRouter` there.
2. **API calls**: three relative calls break in an extension:
   - `src/tools/PdfToWord.jsx`: `/api/pdf-to-word`
   - `src/context/EmailGateContext.jsx`: `/api/send-confirmation`
   - `src/components/ContactChat.jsx`: `/api/contact-message`

   Introduce one `API_BASE` (empty on web, full URL in extension), add the
   domain to `host_permissions`, and allow the extension origin in CORS on the
   `api/` functions.
3. **CSP**: MV3 forbids remote scripts and `eval`.
   - Remove/disable `@vercel/analytics` in the extension build (it loads a
     remote script).
   - Bundle the `pdfjs-dist` worker locally (verify `src/utils/pdfjsSetup`).
   - Check other dependencies for `eval`/`new Function`.
4. **Service worker**: the PWA plugin (`VitePWA`) must be off for the extension
   build; the extension has its own background worker.
5. **Camera tools** (QR Scanner, Document Scanner): popups and side panels make
   camera permission prompts unreliable. Open these in a full tab instead.
6. **Downloads**: `file-saver` works in extension pages; no change expected.
   Verify.
7. **Size**: pdfjs/docx bundles are large. The Web Store allows it, but keep
   the build lean (lazy-load tools).

## Steps

### Step 1: Scaffold (no behaviour change)
- Add `public-extension/manifest.json` (MV3, name, version, icons, `side_panel`
  or `action.default_popup`, minimal permissions).
- Add `vite.extension.config.js` (no PWA plugin, output to `dist-extension/`,
  relative `base: './'`).
- Add `build:extension` script.
- **Done when:** `npm run build:extension` produces a folder that loads in
  Chrome and shows the home screen.

### Step 2: Routing and platform flag
- Add `isExtension` to `src/utils/platform.js`.
- Use `HashRouter` when `isExtension || isNative`; skip `<Analytics />` in the
  extension.
- **Done when:** every tool page opens from the home screen with no 404s.

### Step 3: Client-side tools verified
- Load the extension, run each client-side tool end to end (image converter,
  compressor, images to PDF, PDF to images, merge/split, Word to PDF, CSV/JSON,
  read aloud).
- Fix CSP/worker issues as they appear.
- **Done when:** all client-side tools pass a manual run.

### Step 4: Hosted API
- Add `API_BASE` helper; switch the three `fetch` calls to use it.
- Add CORS headers to `api/*.js`, allowing the extension origin.
- Add `host_permissions` for the API domain.
- **Done when:** PDF to Word, confirmation email and contact form work from the
  extension and the web app is unchanged.

### Step 5: Camera tools
- Open QR Scanner and Document Scanner in a full tab (`chrome.tabs.create`) and
  confirm the camera prompt works.
- **Done when:** both scanners work.

### Step 6: Polish
- Icons (16/32/48/128), screenshots, short and long description.
- Side panel sizing and a responsive layout check at narrow widths.
- Decide on the email gate / payment per the Web Store policy.

### Step 7 (optional): Chrome-native extras
- Context menu: "Convert with FileFlowHQ" on images and PDFs.
- Keyboard shortcut to open the side panel.

### Step 8: Publish
- Chrome Web Store developer account ($5 one-time).
- Privacy policy URL (must disclose the PDF-to-Word upload and the email).
- Permissions justification, screenshots, zip `dist-extension/`, submit for
  review.

## New feature: URL shortener ("compress a URL")

Interpreted as shortening a link (e.g. `https://long.example/...` to
`https://yourdomain/s/abc123`). Works on the web app and in the extension.

Unlike the other tools, this one needs a backend: something must store the
mapping and redirect. Decision: **own service, no third-party shortener API.**

- `api/shorten.js` (Vercel function): validates the URL (http/https only,
  length cap), generates a short code, stores `code -> url`.
- Storage: Vercel KV / Upstash Redis (or similar) with optional expiry.
- Redirect: `/s/:code` route (Vercel rewrite to a function that returns a 301/302).
- Abuse prevention: rate limit per IP, block self-referencing/short-chain links,
  optionally a blocklist for known-malicious domains.

Extension extras: "Shorten this page's URL" button that pre-fills the current
tab's URL (needs `activeTab` permission) and a copy-to-clipboard result.

Steps:
1. Pick the storage provider; add `api/shorten.js`, the `/s/:code` redirect
   and rate limiting.
2. Add a `UrlShortener` tool to `src/tools/` and register it in
   `src/toolsConfig.js`.
3. Wire into the extension via `API_BASE` (Step 4) and add the current-tab
   button (Step 6).

Note: this breaks the "everything runs in your browser" claim for this tool;
the privacy policy and store listing must say the URL is sent to a server.

## Risks

- **Review delays** if permissions are broad. Keep `permissions` minimal
  (`sidePanel`, maybe `contextMenus`).
- **Payment/email gate** may conflict with Web Store policy; decide before
  Step 6.
- **Bundle size** may slow loading; lazy-load heavy tools.
- **Privacy claims**: the site says "no uploads"; PDF to Word does upload, so
  the store listing must say so accurately.
