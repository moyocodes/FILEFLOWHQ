# FileFlowHQ — file conversion, mostly client-side

A React + Tailwind app that converts images, PDFs, and data files. Most tools
run **entirely in the browser** — nothing is sent to a server — but two
features do call a small serverless backend: **PDF to Word** (Word output,
via Adobe PDF Services) uploads the file for conversion, and a post-download
confirmation email is sent via Mailjet. Ships as a web app (Vercel) and, via
Capacitor, as native iOS/Android apps.

## Tools included

| Tool | What it does | How |
|---|---|---|
| Image Converter | PNG ↔ JPG ↔ WebP | Canvas API (client-side) |
| Image & PDF Compressor | Reduce file size / resize dimensions, images and PDFs | Canvas API (client-side) |
| Images to PDF | Combine images into one PDF | `jspdf` (client-side) |
| PDF to Images | Split PDF pages into PNGs | `pdfjs-dist` (client-side) |
| Merge / Split PDF | Combine PDFs or extract page ranges | `pdf-lib` (client-side) |
| PDF to Word | Convert to `.docx` (Adobe PDF Services) or extract plain text | `api/pdf-to-word.js` (server) / `pdfjs-dist` (client) |
| Word to PDF | Convert `.docx` to PDF | client-side |
| PDF Read Aloud | Read PDF text aloud | client-side |
| Document Scanner | Capture/crop a document into a PDF or image | client-side |
| QR & Barcode Scanner | Scan codes via camera | client-side |
| CSV ⇄ JSON | Convert tabular data both directions | plain JS (client-side) |
| URL Shortener | Turn a long link into a short `/s/<code>` link | `api/shorten.js` + `api/s.js` (server, Upstash Redis) |

## Project structure

```
fileflowhq/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json          # Vercel build + redirect config
├── prerender.mjs        # headlessly renders each /tools/* route to static HTML (SEO)
├── capacitor.config.json
├── ios/, android/        # Capacitor native projects
├── api/                  # Vercel serverless functions
│   ├── pdf-to-word.js      # Adobe PDF Services — PDF → Word
│   ├── send-confirmation.js # Mailjet — post-download email
│   └── contact-message.js   # Mailjet — contact form
└── src/
    ├── main.jsx           # App entry; picks BrowserRouter (web) or HashRouter (native)
    ├── App.jsx             # Layout: sidebar + routed tool pages
    ├── index.css           # Tailwind directives + small globals
    ├── toolsConfig.js       # Single source of truth for all tools
    ├── components/           # Rail, Dropzone, ProgressBar, ErrorBanner, FileRow,
    │                           ToolCard, StampBadge, ThemeToggle, ContactChat,
    │                           EmailGateModal, EmailPolicyModal, PageEditorModal,
    │                           PdfThumbnail, ResultCard, ToastStack
    ├── context/              # EmailGateContext, SettingsPanelContext, ToastContext
    ├── pages/
    │   ├── Home.jsx
    │   └── ToolPage.jsx
    ├── tools/                # one component per tool (see table above)
    └── utils/                # fileHelpers, pdfjsSetup, docxToPdf, imagesToPdf,
                                pdfTextExtraction, platform (native vs. web checks)
```

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

This starts a Vite dev server (default `http://localhost:5173`) with hot reload.

## Build for production

```bash
npm run build       # plain Vite build → dist/ (fast, local use)
npm run build:web   # build + prerender — this is what Vercel actually runs
```

`build:web` also runs `prerender.mjs`, which headlessly renders each
`/tools/*` route to static HTML so search engines and social-link previews
see real content. Preview either build locally with:

```bash
npm run preview
```

## Deploying

The web app uses `BrowserRouter` (clean URLs like `/tools/image-converter`),
so the host needs a catch-all rewrite that serves `index.html` for every
path — otherwise a hard refresh or direct link to a tool page 404s.
`vercel.json` already includes that rewrite. (Native iOS/Android builds use
`HashRouter` instead — the switch lives in `src/main.jsx`, based on
`isNative` from `src/utils/platform.js`.)

Deploys are Vercel-only (Netlify config was removed; GitHub Pages was never
fully wired up and isn't a supported target).

### Vercel

1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Vercel, click **New Project** → import the repo.
3. Framework preset: **Vite**. Build command `npm run build:web`, output
   directory `dist` (already set in `vercel.json`).
4. Add these environment variables (see `.env.example`):
   - `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, `MJ_SENDER_EMAIL` — Mailjet,
     required by `api/send-confirmation.js` and `api/contact-message.js`.
   - `KV_REST_API_URL`, `KV_REST_API_TOKEN` — Upstash Redis, required by the
     URL shortener (`api/shorten.js`, `api/s.js`). Create a free Upstash Redis
     database under your Vercel project's **Storage** tab; Vercel injects these
     automatically. (`UPSTASH_REDIS_REST_URL` / `_TOKEN` also work.)
   - `PDF_SERVICES_CLIENT_ID`, `PDF_SERVICES_CLIENT_SECRET` — Adobe PDF
     Services, required by `api/pdf-to-word.js` (Word-output mode). Without
     these the Word-conversion feature fails; the plain-text extraction mode
     still works client-side.
5. Deploy.

Or via CLI:

```bash
npm install -g vercel
vercel --prod
```

## Mobile (iOS / Android)

The app is wrapped with Capacitor (`appId: com.fileflowhq.app`). Native
projects live in `ios/` and `android/` and are checked in.

```bash
npm run sync       # vite build && cap sync — rebuilds web assets and copies them into both native projects
npm run open:ios     # opens the Xcode project (requires Xcode)
npm run open:android # opens the Android Studio project (requires Android Studio)
```

`ios/App/CapApp-SPM/` is Capacitor-CLI-managed boilerplate — don't edit it
directly; it's regenerated by `cap sync`.

## Chrome extension

The same React app also builds as a Manifest V3 Chrome extension that opens in
the browser's side panel. Source lives in `extension/` (manifest, background
script, icons, `store-assets/` for the Web Store listing), `sidepanel.html`,
and `vite.extension.config.js`. The roadmap is in
[`public/chrome-extension-plan.md`](public/chrome-extension-plan.md).

**How it differs from the web build**
- Uses `HashRouter` and skips Vercel Analytics (`isExtension` in
  `src/utils/platform.js`, set by `--mode extension`).
- Calls the hosted API at `https://fileflowhq.com` via `apiUrl()` in
  `src/utils/api.js` (PDF to Word, confirmation email, contact form). The
  `api/*.js` functions allow the extension's origin through `api/_cors.js`.
- Requests only the `sidePanel` permission. It deliberately has **no**
  `host_permissions`: CORS already covers the API calls, and host permissions
  trigger a slower "in-depth" Web Store review.
- `vite.extension.config.js` strips an unused CDN URL that jsPDF ships, so the
  bundle contains no reference to remotely hosted code (forbidden in MV3).

### Try it locally

1. `npm run build:extension` — outputs to `dist-extension/`.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist-extension/` folder.
4. Pin FileFlowHQ from the puzzle-piece menu, then click its icon to open the
   side panel. After a rebuild, click the refresh icon on the extension's card.

An unpacked extension gets a different ID from the store one, so its API calls
are blocked by CORS. To test them, copy its origin from `chrome://extensions`
(`chrome-extension://<id>`) into the `EXTENSION_ORIGINS` environment variable
in Vercel (comma-separated for several) and redeploy. The published store ID
is already allowed in `api/_cors.js`.

### Publish to the Chrome Web Store

1. Bump `version` in `extension/public/manifest.json` (the store rejects a
   version it has already seen).
2. Build and zip the *contents* of the output folder, so `manifest.json` is at
   the zip's top level:
   ```bash
   npm run build:extension
   cd dist-extension && zip -r ../fileflowhq-extension.zip .
   ```
3. Register at the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time $5 fee), click **New item**, and upload the zip. (For an update,
   open the existing item and upload on its **Package** tab.)
4. **Store listing:** description, category, the 128×128 icon, at least one
   1280×800 screenshot, and the 440×280 promo tile. Ready-made images are in
   `extension/store-assets/`.
5. **Privacy practices:** fill in the single-purpose description, the
   `sidePanel` justification, and the remote-code answer (none). Declare the
   data handled (email address; PDF content for PDF to Word), certify the
   policy boxes, and set the privacy policy URL to
   `https://fileflowhq.com/privacy` (the `/privacy` page in this repo). Click
   **Save draft** — the submit button stays disabled until you do.
6. **Distribution:** visibility, regions, and pricing (free).
7. Click **Submit for review** (typically days to a couple of weeks; Google
   emails the publisher account with the result).

## Notes on the PDF tools

- **PDF to Images**, **PDF to Word** (text mode), and **PDF Read Aloud** use
  `pdfjs-dist`, which needs a web worker. Vite bundles this automatically via
  the `?url` import in `src/utils/pdfjsSetup.js` — no extra configuration
  needed after `npm install`.
- **PDF to Word** has two modes: converting to an actual `.docx` uploads the
  file to **Adobe PDF Services** (`api/pdf-to-word.js`), which preserves text
  styling, tables, lists, links, and images, and is capped at 4.5MB per file.
  Plain-text extraction runs entirely client-side via `pdfjs-dist` with no
  size cap and no upload.
- Password-protected or scanned (image-only) PDFs are handled with a clear
  error/notice rather than failing silently.

## Design system

- **Palette**: warm paper (`#EEF0EA`) / ink (`#15181D`) neutrals with a
  single "ink stamp" green accent (`#2F6F4E`), echoing the site's core idea:
  files get *stamped* from one format to another.
  Set as CSS-friendly Tailwind tokens in `tailwind.config.js`.
- **Type**: Space Grotesk for display/headings, Inter for body text,
  JetBrains Mono for filenames/data.
- **Dark mode**: class-based (`dark:` variants), toggled and persisted to
  `localStorage` via `ThemeToggle.jsx`.

## Customizing

- Add a new tool by creating a component in `src/tools/` and registering it
  in `src/toolsConfig.js` — the sidebar, home page grid, and router pick it
  up automatically.
- Adjust the max upload size or accepted MIME types per tool via
  `validateFiles()` in `src/utils/fileHelpers.js`.

## License

All rights reserved — see [LICENSE](LICENSE).
