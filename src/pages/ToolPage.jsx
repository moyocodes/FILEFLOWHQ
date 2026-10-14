import { useEffect, useLayoutEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import StampBadge from '../components/StampBadge.jsx'
import { useSettingsPanel } from '../context/SettingsPanelContext.jsx'
import { applySeo, setFaqJsonLd } from '../utils/useSeo.js'

/**
 * Generic tool route wrapper. Each tool in src/tools/ is a custom hook
 * (e.g. useImageConverter()) that owns all state/handlers and returns
 * { workspace, settings } JSX sharing that state closure. ToolPage calls
 * the hook, renders `workspace` inline (into the center pane it occupies),
 * and pushes `settings` up into the shell's right-hand settings pane via
 * SettingsPanelContext so App.jsx doesn't need to know about tool internals.
 */
function ComingSoonTool({ tool }) {
  return (
    <div className="flex min-h-full flex-col px-6 py-8 sm:px-9">
      <ToolHeader tool={tool} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-[1rem] text-text">Under construction</p>
        <p className="max-w-sm text-[0.8rem] leading-relaxed text-text-dim">
          {tool.name} is still being built. Check back soon.
        </p>
      </div>
      <ToolSeoContent tool={tool} />
    </div>
  )
}

function ToolHeader({ tool }) {
  const Icon = tool.icon
  return (
    <div className="relative mb-6 flex flex-shrink-0 items-start gap-4 overflow-hidden rounded-card border border-border bg-panel p-5 shadow-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 120% at 0% 0%, var(--signal-dim), transparent 70%)' }}
      />
      {Icon && (
        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-signal-dim bg-gradient-to-br from-signal-dim to-transparent text-signal">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      )}
      <div className="relative min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[clamp(1.3rem,2.2vw,1.7rem)] font-bold tracking-tight">{tool.name}</h1>
          <StampBadge formats={tool.formats} />
        </div>
        {tool.description && <p className="text-[0.88rem] text-text-dim">{tool.description}</p>}
      </div>
    </div>
  )
}

function ToolSeoContent({ tool }) {
  const hasContent = tool.intro || (tool.howTo && tool.howTo.length) || (tool.faq && tool.faq.length)
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  if (!hasContent) return null

  return (
    <section className="mb-6 rounded-card border border-border text-text-dim">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-[0.95rem] font-semibold text-text">
          {tool.seoTitle || `More about ${tool.name}`}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          className="flex-shrink-0 text-text-dim"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        </motion.span>
      </button>

      {/* Stays mounted (height-animated, not conditionally rendered) so
          crawlers and the build-time prerender still see this content even
          though it's visually collapsed by default for human visitors. */}
      <motion.div
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        initial={false}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <div className="max-w-[68ch] px-4 pb-4">
          {tool.intro && <p className="mb-6 text-[0.9rem] leading-relaxed">{tool.intro}</p>}

          {tool.howTo && tool.howTo.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-2.5 text-[0.95rem] font-semibold text-text">
                How to use {tool.name}
              </h3>
              <ol className="list-decimal space-y-1.5 pl-5 text-[0.88rem] leading-relaxed">
                {tool.howTo.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {tool.faq && tool.faq.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-[0.95rem] font-semibold text-text">
                Frequently asked questions
              </h3>
              <div className="space-y-2">
                {tool.faq.map((item, i) => (
                  <details key={i} className="group rounded-lg border border-border bg-panel px-4 py-3">
                    <summary className="cursor-pointer list-none text-[0.88rem] font-medium text-text marker:hidden">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-[0.85rem] leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  )
}

export default function ToolPage({ tool }) {
  const useTool = tool.component
  const { workspace, settings } = useTool()
  const { setSettingsContent, clearSettingsContent } = useSettingsPanel()

  useEffect(() => {
    applySeo({
      fullTitle: tool.seoTitle ? `${tool.seoTitle} | FileFlowHQ` : undefined,
      title: tool.seoTitle ? undefined : tool.name,
      description: tool.comingSoon
        ? `${tool.name} is coming soon to FileFlowHQ — ${tool.seoDescription || tool.description}`
        : tool.seoDescription ||
          `${tool.description} Free and private — most tools run entirely in your browser.`,
      keywords: tool.keywords,
      path: tool.path,
    })
    setFaqJsonLd(tool.faq)
    return () => setFaqJsonLd(null)
  }, [tool])

  useLayoutEffect(() => {
    if (tool.comingSoon) {
      clearSettingsContent()
      return
    }
    setSettingsContent(settings)
    return () => clearSettingsContent()
  }, [settings, setSettingsContent, clearSettingsContent, tool.comingSoon])

  if (tool.comingSoon) {
    return <ComingSoonTool tool={tool} />
  }

  return (
    <div className="flex min-h-full flex-col px-6 py-8 sm:px-9">
      <ToolHeader tool={tool} />
      <ToolSeoContent tool={tool} />
      <div className="flex flex-1 flex-col">{workspace}</div>
    </div>
  )
}
