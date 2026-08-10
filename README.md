# FileFlowHQ — free, client-side file conversion

A single-page React + Tailwind app that converts images, PDFs, and data files
entirely **in the browser**. No backend, no file upload, no server costs —
it can be hosted for free on Vercel, Netlify, or GitHub Pages as a static site.

## Tools included

| Tool | What it does | Library used |
|---|---|---|
| Image Converter | PNG ↔ JPG ↔ WebP | Canvas API |
| Image Compressor | Reduce file size / resize dimensions | Canvas API |
| Images to PDF | Combine images into one PDF | `jspdf` |
| PDF to Images | Split PDF pages into PNGs | `pdfjs-dist` |
| Merge / Split PDF | Combine PDFs or extract page ranges | `pdf-lib` |
| PDF to Word (basic) | Extract PDF text into a `.docx` | `pdfjs-dist` + `docx` |
| CSV ⇄ JSON | Convert tabular data both directions | plain JS |

Every tool processes files with `FileReader`/`Canvas`/WebAssembly-backed
libraries directly on the user's device. Nothing is ever sent to a server.

## Project structure

```
fileflowhq/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json          # Vercel build + redirect config
└── src/
    ├── main.jsx           # App entry, HashRouter + theme bootstrap
    ├── App.jsx             # Layout: sidebar + routed tool pages
    ├── index.css           # Tailwind directives + small globals
    ├── toolsConfig.js       # Single source of truth for all tools
    ├── components/
    │   ├── Rail.jsx
    │   ├── Dropzone.jsx      # Drag-and-drop + browse button
    │   ├── ProgressBar.jsx
    │   ├── ErrorBanner.jsx
    │   ├── FileRow.jsx
    │   ├── ToolCard.jsx
    │   ├── StampBadge.jsx
    │   └── ThemeToggle.jsx
    ├── pages/
    │   ├── Home.jsx
    │   └── ToolPage.jsx
    ├── tools/
    │   ├── ImageConverter.jsx
    │   ├── ImageCompressor.jsx
    │   ├── ImagesToPdf.jsx
    │   ├── PdfToImages.jsx
    │   ├── MergeSplitPdf.jsx
    │   ├── PdfToWord.jsx
    │   └── CsvJson.jsx
    └── utils/
        ├── fileHelpers.js     # validation, downloads, canvas helpers
        └── pdfjsSetup.js       # pdf.js worker configuration
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
npm run build
```

Outputs a static site to `dist/`. Preview it locally with:

```bash
npm run preview
```

## Deploying

The web app uses `BrowserRouter` (clean URLs like `/tools/image-converter`), so
the host needs a catch-all rewrite that serves `index.html` for every path —
otherwise a hard refresh or direct link to a tool page 404s. `vercel.json`
already includes that rewrite plus a www → non-www redirect. (Native iOS/Android
builds use `HashRouter` automatically — see `src/utils/platform.js`.)

### Vercel

1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Vercel, click **New Project** → import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` (already set in `vercel.json`).
4. Add `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, and `MJ_SENDER_EMAIL` as
   environment variables (see `.env.example`) — required by the
   `api/send-confirmation.js` function that emails users a download
   confirmation via Mailjet.
5. Deploy.

Or via CLI:

```bash
npm install -g vercel
vercel --prod
```

### GitHub Pages

1. `npm run build`
2. Push the contents of `dist/` to a `gh-pages` branch (e.g. using the
   `gh-pages` npm package, or GitHub Actions), or configure Pages to serve
   from a `dist` folder via an Actions workflow.
3. GitHub Pages has no built-in rewrite config, and with `BrowserRouter` a
   direct link or refresh on a tool page (e.g. `/tools/image-converter`)
   will 404. This needs the common `404.html`-redirects-to-`index.html`
   workaround (or switching back to `HashRouter`) to work correctly — not
   set up here.

## Notes on the PDF tools

- **PDF to Images** and **PDF to Word** use `pdfjs-dist`, which needs a web
  worker. Vite bundles this automatically via the `?url` import in
  `src/utils/pdfjsSetup.js` — no extra configuration needed after
  `npm install`.
- **PDF to Word** does *basic text extraction only*: it pulls text line by
  line based on position and writes it into a `.docx`. Complex layouts,
  multi-column text, tables, and images will not be preserved — this is
  called out in the tool's UI.
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

Use this freely for your own project.
