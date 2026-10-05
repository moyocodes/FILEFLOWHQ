/**
 * Post-build prerender: writes a static HTML file for every route so search
 * engines and social scrapers get the right <title>, description, canonical,
 * Open Graph tags, JSON-LD and real page text without running any JS.
 *
 * It needs no headless browser. The previous Puppeteer version couldn't launch
 * Chrome on Vercel's build image, silently skipped, and every URL was served
 * the homepage shell (homepage title + canonical pointing at "/"), so Google
 * treated all tool pages as duplicates of the homepage.
 *
 * Each page's static content sits inside #root; the SPA's createRoot() replaces
 * it on load, so visitors see the normal app.
 *
 * Also generates dist/sitemap.xml from the same route list.
 *
 * Run automatically after `vite build` via the "build:web" script.
 */
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, 'dist')
const SITE_URL = 'https://fileflowhq.com'
const SITE_NAME = 'FileFlowHQ'

// Load the tools array from src/toolsConfig.js — the same source of truth the
// app uses — with every import (tool components, icons) stubbed out, so only
// the plain data is evaluated.
async function loadTools() {
  const entry = join(__dirname, 'src/toolsConfig.js')
  const out = join(DIST, '.tools-config.mjs')
  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    plugins: [
      {
        name: 'stub-imports',
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) =>
            args.kind === 'entry-point' ? null : { path: args.path, namespace: 'stub' }
          )
          b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: 'module.exports = new Proxy(function () {}, { get: () => function () {} })',
            loader: 'js',
          }))
        },
      },
    ],
  })
  try {
    const mod = await import(pathToFileURL(out).href)
    return mod.tools
  } finally {
    await rm(out, { force: true })
  }
}

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The FAQ block gets the id setFaqJsonLd() (src/utils/useSeo.js) uses, so the
// app replaces it on load instead of adding a duplicate.
const jsonLd = (data) =>
  `<script type="application/ld+json"${data['@type'] === 'FAQPage' ? ' id="faq-jsonld"' : ''}>${JSON.stringify(
    data
  ).replace(/</g, '\\u003c')}</script>`

function toolLinks(tools) {
  return `<nav aria-label="All tools"><h2>All FileFlowHQ tools</h2><ul>${tools
    .map((t) => `<li><a href="${t.path}">${esc(t.name)}</a> — ${esc(t.tagline || t.description)}</li>`)
    .join('')}</ul></nav>`
}

function breadcrumb(name, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  }
}

function buildPages(tools) {
  const homeDescription =
    'Convert images, PDFs, and data files for free, right in your browser. PNG/JPG/WebP conversion, image compression, PDF to images, merge/split PDF, CSV to JSON and back. Almost everything runs locally in your browser, with no tracking.'

  const pages = [
    {
      path: '/',
      title: `${SITE_NAME} — Free Online File Converter (Images, PDF, CSV/JSON)`,
      description: homeDescription,
      body: `<main><h1>FileFlowHQ — free online file converter</h1><p>FileFlowHQ (FileFlow HQ) is a free file converter that runs in your browser. ${esc(homeDescription)}</p>${toolLinks(tools)}</main>`,
      jsonLd: [],
      priority: '1.0',
      changefreq: 'weekly',
    },
    {
      path: '/contact',
      title: `Contact — ${SITE_NAME}`,
      description:
        'Contact FileFlowHQ: report a bug, request a feature, ask a privacy question, or get in touch about partnerships. We reply by email.',
      body: `<main><h1>Contact FileFlowHQ</h1><p>Found a bug, want a feature, or have a question? Send us a message and we reply by email.</p>${toolLinks(tools)}</main>`,
      jsonLd: [breadcrumb('Contact', '/contact')],
      priority: '0.4',
      changefreq: 'yearly',
    },
    {
      path: '/privacy',
      title: `Privacy Policy — ${SITE_NAME}`,
      description:
        'How FileFlowHQ handles your data: almost every tool runs entirely in your browser, so your files never leave your device.',
      body: `<main><h1>Privacy Policy</h1><p>This policy covers the FileFlowHQ website (fileflowhq.com), its mobile apps, and its Chrome extension. In short: almost everything happens on your device.</p>${toolLinks(tools)}</main>`,
      jsonLd: [breadcrumb('Privacy Policy', '/privacy')],
      priority: '0.3',
      changefreq: 'yearly',
    },
  ]

  for (const tool of tools) {
    // Mirrors ToolPage.jsx's applySeo() call so the static and live tags agree.
    const title = tool.seoTitle ? `${tool.seoTitle} | ${SITE_NAME}` : `${tool.name} — ${SITE_NAME}`
    const description = tool.comingSoon
      ? `${tool.name} is coming soon to FileFlowHQ — ${tool.seoDescription || tool.description}`
      : tool.seoDescription ||
        `${tool.description} Free and private — most tools run entirely in your browser.`

    const howTo = tool.howTo?.length
      ? `<h2>How to use ${esc(tool.name)}</h2><ol>${tool.howTo.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      : ''
    const faq = tool.faq?.length
      ? `<h2>Frequently asked questions</h2>${tool.faq
          .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
          .join('')}`
      : ''

    const ld = [breadcrumb(tool.name, tool.path)]
    if (tool.faq?.length) {
      ld.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: tool.faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      })
    }
    if (tool.howTo?.length) {
      ld.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `How to use ${tool.name}`,
        step: tool.howTo.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
      })
    }

    pages.push({
      path: tool.path,
      title,
      description,
      keywords: tool.keywords,
      body: `<main><h1>${esc(tool.seoTitle || tool.name)}</h1><p>${esc(tool.intro || description)}</p>${howTo}${faq}${toolLinks(tools)}</main>`,
      jsonLd: ld,
      priority: '0.8',
      changefreq: 'monthly',
    })
  }

  return pages
}

function setTag(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`prerender: pattern not found in index.html: ${pattern}`)
  return html.replace(pattern, replacement)
}

function renderPage(shell, page) {
  const url = `${SITE_URL}${page.path}`
  const t = esc(page.title)
  const d = esc(page.description)
  let html = shell
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`)
  html = setTag(html, /<meta\s+name="description"[^>]*>/, `<meta name="description" content="${d}" />`)
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}" />`)
  html = setTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${d}" />`)
  html = setTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${t}" />`)
  html = setTag(html, /<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${d}" />`)
  if (page.keywords) {
    html = setTag(html, /<meta name="keywords"[^>]*>/, `<meta name="keywords" content="${esc(page.keywords)}" />`)
  }
  if (page.jsonLd.length) {
    html = html.replace('</head>', `    ${page.jsonLd.map(jsonLd).join('\n    ')}\n  </head>`)
  }
  html = setTag(html, /<div id="root"><\/div>/, `<div id="root">${page.body}</div>`)
  return html
}

function renderSitemap(pages) {
  const lastmod = new Date().toISOString().slice(0, 10)
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

async function run() {
  const shell = await readFile(join(DIST, 'index.html'), 'utf8')
  const tools = await loadTools()
  const pages = buildPages(tools)

  for (const page of pages) {
    // "/tools/x" -> dist/tools/x.html, served at /tools/x via cleanUrls.
    const file = page.path === '/' ? join(DIST, 'index.html') : join(DIST, `${page.path}.html`)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, renderPage(shell, page), 'utf8')
    console.log(`[prerender] ${page.path} -> ${file.replace(DIST, 'dist')}`)
  }

  await writeFile(join(DIST, 'sitemap.xml'), renderSitemap(pages), 'utf8')
  console.log(`[prerender] done — ${pages.length} routes + sitemap.xml`)
}

// Fail the build loudly: a silent skip is what left the site un-indexable.
run().catch((err) => {
  console.error('[prerender] failed:', err)
  process.exit(1)
})
