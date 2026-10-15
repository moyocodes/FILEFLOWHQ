# FileFlowHQ Studio — plan

Branch: `feature/craft-apps`

## Goal

Add 13 full in-browser editors (PDF, photo, video, vector, audio, docs, slides,
spreadsheets, CAD, …) to FileFlowHQ as a new **Studio** section, built from the
open-source ArtCraft "Crafting Apps" (https://github.com/storytold, MIT OR
Apache-2.0). Everything stays **serverless**: each editor is a static
WebAssembly app served from our own domain and runs entirely in the visitor's
browser. No requests go to ArtCraft's servers at runtime.

## How it works

| Piece | What it does |
|---|---|
| `src/studioApps.js` | Single source of truth: id, our name, description, upstream repo + pinned version. |
| `scripts/fetch-studio-apps.mjs` | Downloads each pinned `*-web-<version>.zip` from GitHub Releases into `.studio-cache/` (cached), and with `--out dist/studio-apps` copies them into the build. |
| `/studio-apps/<id>/<version>/app` | The static editor (HTML + JS + `.wasm`) on our domain. `index.html` is renamed to `app.html` so Vercel's `cleanUrls` keeps relative asset URLs working. |
| `/studio` | Gallery page listing every editor. |
| `/studio/<id>` | Full-height page that embeds the editor in an iframe. |
| `vite.config.js` | Dev server serves `/studio-apps` from `.studio-cache/` so `npm run dev` works. PWA precache ignores the editors (too big). |
| `vercel.json` | `application/wasm` + long-cache headers (safe because the version is in the URL). |

The binaries (~450 MB unzipped) are **not committed**: they're fetched at build
time from pinned release URLs, so the repo stays small and upgrading an editor is
a one-line version bump.

## The 13 editors

| Our name | Route | Upstream | Version |
|---|---|---|---|
| PDF Editor | `/studio/pdf-editor` | pdfcraft | 0.7.1 |
| Photo Editor | `/studio/photo-editor` | photocraft | 0.8.2 |
| Photo Library & RAW | `/studio/raw-editor` | lightcraft | 0.7.1 |
| Vector Editor | `/studio/vector-editor` | vectorcraft | 0.10.0 |
| Video Editor | `/studio/video-editor` | filmcraft | 0.7.2 |
| Motion & Effects | `/studio/motion-editor` | effectcraft | 0.9.2 |
| Audio Studio | `/studio/audio-editor` | soundcraft | 0.6.1 |
| Page Layout | `/studio/layout-editor` | designcraft | 0.7.1 |
| UI Design | `/studio/ui-designer` | figcraft | 0.5.1 |
| Word Processor | `/studio/word-processor` | wordcraft | 0.6.1 |
| Slides | `/studio/slides` | deckcraft | 0.6.1 |
| Spreadsheet | `/studio/spreadsheet` | gridcraft | 0.6.1 |
| CAD Drafting | `/studio/cad` | cadcraft | 0.6.2 |

## Licensing & ownership rules

- **Allowed:** using, modifying, rebranding the *product* (our own names, our
  UI around it) and using it commercially. All of this is permitted by MIT /
  Apache-2.0.
- **Required:** keep each app's `LICENSE-*` and `NOTICE` files (they ship inside
  every `/studio-apps/<id>/<version>/` folder) and credit the upstream project (the Studio
  page has an "Open-source credits" section).
- **Not allowed:** claiming we wrote the upstream code, or using ArtCraft's
  name, wordmark or logos as our brand (trademarks are excluded from the
  license). That's why our editors use generic names.
- **We own:** FileFlowHQ, the Studio pages, our integration code and any
  changes we make to the editors.

## Rebranded editors

Upstream builds show the upstream name, logo, community card and Discord/GitHub
links, all compiled into the app. To ship an editor as FileFlowHQ:

1. Edit the source (in `~/Developer/craft-apps/<repo>`), save the diff as
   `studio/patches/<repo>.patch`.
2. `scripts/build-branded-studio-app.sh <id> <repo> <tag>` → builds with trunk and
   installs into `studio-builds/<id>/` (committed, so Vercel needs no Rust).
3. In `src/studioApps.js` set `branded: true` and a new `version` (e.g. `0.7.1-ffhq.2`)
   so browsers fetch the new files.

The PDF Editor patch: FileFlowHQ name in every string (incl. translations), welcome
copy, no community card / Discord button / Help-menu community links / update check,
About dialog without logo and contributor tab. Redesign (`0.7.1-ffhq.2`): FileFlowHQ palette
(dark by default; the Studio page passes `?theme=light|dark` from the site), Poppins UI font
(OFL, `assets/fonts/Poppins-*`), FileFlowHQ mark + wordmark in the top bar and on the welcome
screen (`assets/brand/`, `crates/ui-egui/src/brand.rs`), one top bar (logo, menu, mode switcher,
search, Open) with document tabs in a slim row shown only while files are open, and a centred
welcome screen with a drop zone.

The upstream `LICENSE-*` and `NOTICE` files must stay in each build folder.

## Paid exports

Editing is free; saving, exporting and printing from a rebranded editor costs
one *paid* credit from the site-wide Paystack balance (free trial uses don't
count). Flow: editor → `ffhq:export` message (name + bytes) → `StudioExportGate`
→ `/api/usage { paid: true }` → download, or Paystack popup → `/api/pay-verify`
→ download. A FileFlowHQ watermark covers the editor until the visitor has paid
credits. Opened outside our page, the editor refuses to save.

Limits: everything runs on the user's device, so a determined user can bypass
it (and the upstream editor is free on GitHub). It stops normal users.

## Phases

1. **Embed (this branch)** — host all 13 prebuilt web builds, gallery + editor pages, nav, SEO.
2. **Hand-off** — "Open in editor" buttons on existing tools (e.g. after Merge PDF → open
   result in PDF Editor via `?file=`; same-origin blob/URL hand-off).
3. **Own builds** — install Rust + trunk, build from our fork(s) under our GitHub,
   theme them to FileFlowHQ colors, trim features we don't need, smaller bundles.
4. **Our own open-source project** — see `TODO.md`.

## Known limits / risks

- Upstream status is early alpha / in development — expect rough edges.
- Bundles are 10–110 MB of WASM each (gzip/brotli roughly halves them); first
  load is slow on mobile. Loaded only when someone opens that editor.
- Needs WebGPU or WebGL2. Phones are a poor fit for full desktop editors.
- Native iOS/Android apps point the iframe at https://fileflowhq.com (the
  editors are not bundled into the mobile apps).
- Check Vercel's per-file / deployment size limits on the first deploy.
