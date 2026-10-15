import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  RotateCw,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Aperture,
  PenTool,
  Clapperboard,
  Sparkles,
  AudioLines,
  LayoutTemplate,
  Frame,
  FileType,
  Presentation,
  Sheet,
  DraftingCompass
} from 'lucide-react'
import { studioApps, studioPath, studioAppSrc } from '../studioApps.js'
import { applySeo } from '../utils/useSeo.js'
import { isNative } from '../utils/platform.js'
import StudioExportGate from '../components/StudioExportGate.jsx'
import { keepDocuments, keptDocuments } from '../utils/studioStore.js'

export const studioIcons = {
  FileText,
  Image: ImageIcon,
  Aperture,
  PenTool,
  Clapperboard,
  Sparkles,
  AudioLines,
  LayoutTemplate,
  Frame,
  FileType,
  Presentation,
  Sheet,
  DraftingCompass
}

// The native iOS/Android shells don't bundle the editors; they load them from the live site.
const ORIGIN = isNative ? 'https://fileflowhq.com' : ''

/** /studio — gallery of every editor. */
export function StudioHome() {
  useEffect(() => {
    applySeo({
      title: 'Studio — Free Online Editors',
      description:
        'Free editors that run entirely in your browser: edit PDFs, photos, video, vectors, audio, documents, slides, spreadsheets and CAD drawings. No uploads, no sign-up.',
      keywords: 'online pdf editor, free photo editor, online video editor, browser spreadsheet, online cad',
      path: '/studio'
    })
  }, [])

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-signal-dim to-transparent">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          <h1 className="text-[clamp(1.6rem,3vw,2.3rem)] font-medium leading-[1.15] tracking-tight">Studio</h1>
          <p className="mt-2 max-w-[60ch] text-[0.95rem] leading-relaxed text-text-dim">
            {studioApps.length} full editors that run entirely in your browser. Your files stay on your device: nothing is
            uploaded. Best on a desktop or laptop.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studioApps.map((app) => {
            const Icon = studioIcons[app.icon] || FileText
            return (
              <li key={app.id}>
                <Link
                  to={studioPath(app)}
                  className="group flex h-full gap-4 rounded-card bg-panel p-5 shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-signal-dim text-signal">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[0.95rem] font-medium text-text">{app.name}</span>
                      <span className="rounded-full bg-panel-raised px-2 py-0.5 text-[0.65rem] font-normal text-text-dim">
                        {app.status}
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.83rem] leading-relaxed text-text-dim">{app.description}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-[0.8rem] font-medium text-signal">
                      Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

/** Covers the frame until the editor says it is running (or fails to start). */
function StudioLoader({ app, failed, slow }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-void px-6 text-center">
      <Link
        to="/studio"
        aria-label="All editors"
        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-panel-raised text-text"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <img src="/logo.svg" alt="" width="87" height="54" className={`h-16 w-auto ${failed ? 'opacity-40' : 'signal-dot'}`} />
      <div>
        <p className="text-[1rem] font-medium">{failed ? `${app.name} couldn't start` : `Opening ${app.name}…`}</p>
        <p className="mt-1 max-w-[42ch] text-[0.82rem] leading-relaxed text-text-dim">
          {failed
            ? 'Your browser may not support WebGL2, or the download was interrupted.'
            : slow
              ? 'Still downloading. The first open fetches the whole editor (about 40 MB); after that it opens instantly.'
              : 'Everything runs on your device. Nothing is uploaded.'}
        </p>
      </div>
      {failed || slow ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-full bg-panel-raised px-4 py-2 text-[0.82rem] font-normal"
        >
          <RotateCw className="h-3.5 w-3.5" /> Reload
        </button>
      ) : null}
      {!failed && (
        <div className="h-1 w-48 overflow-hidden rounded-full bg-panel-raised" role="progressbar" aria-label={`Loading ${app.name}`}>
          <div className="studio-load-bar h-full w-2/5 rounded-full bg-signal" />
        </div>
      )}
    </div>
  )
}

/** /studio/<id> — one editor, embedded full-height. */
export function StudioAppPage({ app, active = true }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [slow, setSlow] = useState(false)
  const navigate = useNavigate()
  const frame = useRef(null)
  const stage = useRef(null)
  // Rebranded editors open in the site's theme. Read once: changing the src would reload the editor.
  const [theme] = useState(() =>
    typeof document !== 'undefined' && !document.documentElement.classList.contains('dark') ? 'light' : 'dark'
  )
  const src = studioAppSrc(app, ORIGIN, app.branded ? { theme } : {})

  // Rebranded editors report when they are running (`pdfcraft:ready`); an older PDF editor build
  // may still ask for Back and Full screen (`ffhq:action`). Others count as loaded on the frame's load.
  useEffect(() => {
    if (!app.branded) return
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      const { type, action, docs } = event.data || {}
      if (type === 'pdfcraft:ready') {
        setLoaded(true)
        // Reopen what was open before the reload (kept in this browser only).
        keptDocuments(app.id).then((kept) => {
          for (const { name, bytes } of kept) {
            frame.current?.contentWindow?.postMessage({ type: 'pdfcraft:open', name, bytes }, window.location.origin)
          }
        })
      } else if (type === 'ffhq:snapshot' && Array.isArray(docs)) keepDocuments(app.id, docs)
      else if (type === 'pdfcraft:failed') setFailed(true)
      else if (type === 'ffhq:action' && action === 'back') navigate('/studio')
      else if (type === 'ffhq:action' && action === 'fullscreen') {
        if (document.fullscreenElement) document.exitFullscreen?.()
        else stage.current?.requestFullscreen?.()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [app.branded, app.id, navigate])

  useEffect(() => {
    if (loaded) return
    const timer = setTimeout(() => setSlow(true), 25000)
    return () => clearTimeout(timer)
  }, [loaded])

  useEffect(() => {
    if (!active) return
    applySeo({
      title: `${app.name} — Free Online ${app.tagline}`,
      description: `${app.description} Free, runs entirely in your browser — your files never leave your device.`,
      path: studioPath(app)
    })
  }, [app, active])

  const editor = (
    <div ref={stage} className="relative min-h-0 flex-1 bg-void">
      {(!loaded || failed) && <StudioLoader app={app} failed={failed} slow={slow} />}
      {/* Rebranded editors hand saves/exports to the page, which charges for them. */}
      {app.branded && <StudioExportGate iframeRef={frame} app={app} />}
      <iframe
        ref={frame}
        key={app.id}
        src={src}
        title={app.name}
        onLoad={() => !app.branded && setLoaded(true)}
        allow="fullscreen; clipboard-read; clipboard-write"
        allowFullScreen
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )

  // Every editor fills the window under the same FileFlowHQ Studio bar (the site's nav steps
  // aside, App.jsx). Branded editors stay mounted while the visitor is elsewhere on the site, so
  // their open documents survive.
  return (
    <div className={active ? 'flex h-[100dvh] flex-col' : 'hidden'}>
      <StudioBar app={app} src={src} stage={stage} />
      {editor}
    </div>
  )
}

/**
 * The bar above every Studio editor: Back, the FileFlowHQ Studio logo, the editor's name (a
 * switcher to the other editors) and Full screen. The same for every editor, so they read as one
 * product whatever each editor looks like inside.
 */
function StudioBar({ app, src, stage }) {
  const [switcher, setSwitcher] = useState(false)
  const Icon = studioIcons[app.icon] || FileText
  useEffect(() => {
    if (!switcher) return
    const close = (e) => e.key === 'Escape' && setSwitcher(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [switcher])

  const fullscreen = 'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full bg-panel-raised px-3 text-[0.78rem] font-normal transition-colors hover:text-signal'
  return (
    <header className="relative z-30 flex h-12 flex-shrink-0 items-center gap-2 border-b border-border bg-panel px-2 sm:px-3">
      <Link
        to="/studio"
        aria-label="All editors"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-dim transition-colors hover:bg-panel-raised hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <Link to="/studio" className="flex flex-shrink-0 items-center gap-2" aria-label="FileFlowHQ Studio">
        <img src="/favicon.svg" alt="" width="24" height="24" className="h-6 w-6" />
        <span className="hidden text-[0.88rem] font-medium sm:inline">
          FileFlowHQ <span className="text-signal">Studio</span>
        </span>
      </Link>
      <span className="hidden text-text-dim sm:inline">/</span>
      <div className="relative min-w-0">
        <button
          type="button"
          onClick={() => setSwitcher((v) => !v)}
          aria-expanded={switcher}
          className="flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.88rem] font-normal transition-colors hover:bg-panel-raised"
        >
          <Icon className="h-4 w-4 flex-shrink-0 text-signal" strokeWidth={1.9} />
          <h1 className="truncate">{app.name}</h1>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-text-dim transition-transform ${switcher ? 'rotate-180' : ''}`} />
        </button>
        {switcher && (
          <>
            <button type="button" aria-label="Close" className="fixed inset-0 cursor-default" onClick={() => setSwitcher(false)} />
            <ul className="absolute left-0 top-full z-10 mt-1.5 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-border bg-panel p-1.5 shadow-lift">
              {studioApps.map((other) => {
                const OtherIcon = studioIcons[other.icon] || FileText
                return (
                  <li key={other.id}>
                    <Link
                      to={studioPath(other)}
                      onClick={() => setSwitcher(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.85rem] transition-colors hover:bg-panel-raised ${other.id === app.id ? 'text-signal' : ''}`}
                    >
                      <OtherIcon className="h-4 w-4 flex-shrink-0 text-signal" strokeWidth={1.9} />
                      {other.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
      <span className="ml-auto hidden truncate text-[0.75rem] text-text-dim md:inline">Runs on your device · nothing is uploaded</span>
      {app.branded ? (
        // In place: on its own the editor can't save (saves go through this page).
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen?.() : stage.current?.requestFullscreen?.())}
          className={`${fullscreen} max-md:ml-auto`}
        >
          <Maximize2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Full screen</span>
        </button>
      ) : (
        <a href={src} target="_blank" rel="noreferrer" className={`${fullscreen} max-md:ml-auto`}>
          <Maximize2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Full screen</span>
        </a>
      )}
    </header>
  )
}
