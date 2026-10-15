/**
 * FileFlowHQ Studio: full in-browser editors built from the open-source
 * ArtCraft "Crafting Apps" (https://github.com/storytold, MIT OR Apache-2.0).
 *
 * Each editor is a prebuilt static WebAssembly app, fetched at build time by
 * scripts/fetch-studio-apps.mjs and served from our own domain at
 * /studio-apps/<id>/<version>/app — nothing runs on a server.
 *
 * Plain data only (no imports): the fetch script and prerender read it in Node.
 * Bump `version` to upgrade an editor.
 */
export const studioApps = [
  {
    id: 'pdf-editor',
    name: 'PDF Editor',
    tagline: 'Read, annotate and edit PDFs',
    description: 'A full PDF workbench in your browser: view, annotate, edit text, reorder pages and export.',
    icon: 'FileText',
    status: 'Early alpha',
    repo: 'pdfcraft',
    // Rebranded from source: upstream v0.7.1 + studio/patches/pdfcraft.patch, built into
    // studio-builds/pdf-editor/ by scripts/build-branded-studio-app.sh. Bump the suffix on rebuilds.
    version: '0.7.1-ffhq.9',
    branded: true,
  },
  {
    id: 'photo-editor',
    name: 'Photo Editor',
    tagline: 'Layers, brushes, filters',
    description: 'Layer-based image editing with brushes, selections, adjustments and filters.',
    icon: 'Image',
    status: 'Early alpha',
    repo: 'photocraft',
    // Rebranded: upstream v0.8.2 + studio/patches/photocraft.patch (see pdf-editor).
    version: '0.8.2-ffhq.2',
    branded: true,
  },
  {
    id: 'raw-editor',
    name: 'Photo Library & RAW',
    tagline: 'Non-destructive photo developing',
    description: 'Organize photos and develop RAW files non-destructively, with exports straight to your device.',
    icon: 'Aperture',
    status: 'In development',
    repo: 'lightcraft',
    version: '0.7.1',
  },
  {
    id: 'vector-editor',
    name: 'Vector Editor',
    tagline: 'Illustrations, logos, SVG',
    description: 'Draw and edit vector artwork — paths, shapes, text and SVG export.',
    icon: 'PenTool',
    status: 'In development',
    repo: 'vectorcraft',
    version: '0.10.0',
  },
  {
    id: 'video-editor',
    name: 'Video Editor',
    tagline: 'Timeline video editing',
    description: 'A nonlinear, timeline-based video editor with cuts, tracks and export.',
    icon: 'Clapperboard',
    status: 'In development',
    repo: 'filmcraft',
    version: '0.7.2',
  },
  {
    id: 'motion-editor',
    name: 'Motion & Effects',
    tagline: 'Motion graphics and compositing',
    description: 'Keyframed motion graphics, compositing and visual effects.',
    icon: 'Sparkles',
    status: 'In development',
    repo: 'effectcraft',
    version: '0.9.2',
    // Its own service worker precaches "./index.html", which we rename to app.html.
    query: 'nosw',
  },
  {
    id: 'audio-editor',
    name: 'Audio Studio',
    tagline: 'Multitrack audio workstation',
    description: 'Record, arrange and mix multitrack audio in a full digital audio workstation.',
    icon: 'AudioLines',
    status: 'In development',
    repo: 'soundcraft',
    version: '0.6.1-ffhq.2',
    branded: true,
  },
  {
    id: 'layout-editor',
    name: 'Page Layout',
    tagline: 'Brochures, magazines, print',
    description: 'Page layout and publishing for print and PDF: frames, typography, master pages.',
    icon: 'LayoutTemplate',
    status: 'In development',
    repo: 'designcraft',
    version: '0.7.1',
  },
  {
    id: 'ui-designer',
    name: 'UI Design',
    tagline: 'Interface design and prototyping',
    description: 'Design app and web interfaces, build components and click-through prototypes.',
    icon: 'Frame',
    status: 'Early alpha',
    repo: 'figcraft',
    version: '0.5.1',
  },
  {
    id: 'word-processor',
    name: 'Word Processor',
    tagline: 'Write and edit documents',
    description: 'Write, format and edit documents, with Word-style layout and shortcuts.',
    icon: 'FileType',
    status: 'In development',
    repo: 'wordcraft',
    version: '0.6.1-ffhq.1',
    branded: true,
  },
  {
    id: 'slides',
    name: 'Slides',
    tagline: 'Presentations',
    description: 'Build and present slide decks, PowerPoint-style.',
    icon: 'Presentation',
    status: 'In development',
    repo: 'deckcraft',
    version: '0.6.1',
  },
  {
    id: 'spreadsheet',
    name: 'Spreadsheet',
    tagline: 'Formulas, tables, data',
    description: 'Spreadsheets with formulas, formatting and data analysis, Excel-style.',
    icon: 'Sheet',
    status: 'In development',
    repo: 'gridcraft',
    version: '0.6.1',
  },
  {
    id: 'cad',
    name: 'CAD Drafting',
    tagline: '2D drafting and design',
    description: 'Computer-aided design and drafting with layers, dimensions and precise geometry.',
    icon: 'DraftingCompass',
    status: 'In development',
    repo: 'cadcraft',
    version: '0.6.2',
  },
]

export const studioPath = (app) => `/studio/${app.id}`

/** Where the static editor is served. Native apps load it from the live site. */
/** `params` (e.g. `{ theme: 'dark' }`) are added to the app's own query. */
export const studioAppSrc = (app, origin = '', params = {}) => {
  // app.query stays verbatim (`nosw` is a bare flag, which URLSearchParams would turn into `nosw=`).
  const extra = new URLSearchParams(params).toString()
  const qs = [app.query, extra].filter(Boolean).join('&')
  return `${origin}/studio-apps/${app.id}/${app.version}/app${qs ? `?${qs}` : ''}`
}

export const releaseZipUrl = (app) =>
  `https://github.com/storytold/${app.repo}/releases/download/v${app.version}/${app.repo}-web-${app.version}.zip`
