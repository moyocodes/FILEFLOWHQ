import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import StampBadge from '../components/StampBadge.jsx'
import ProcessIllustration from '../components/ProcessIllustration.jsx'
import { applySeo, setFaqJsonLd } from '../utils/useSeo.js'

/**
 * Generic tool route wrapper. Each tool in src/tools/ is a custom hook
 * (e.g. useImageConverter()) that owns all state/handlers and returns
 * { workspace, settings } JSX sharing that state closure. ToolPage lays them
 * out side by side: workspace on the left, settings in a sticky card on the
 * right (stacked below the workspace on phones).
 */
function ComingSoonTool({ tool }) {
  return (
    <>
      <ToolHero tool={tool} />
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-medium">Under construction</p>
        <p className="mx-auto mt-1 max-w-sm text-[0.9rem] text-text-dim">{tool.name} is still being built. Check back soon.</p>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ToolSeoContent tool={tool} />
      </div>
    </>
  )
}

/** Tinted hero band: name + description on the left, process illustration behind/right. */
function ToolHero({ tool }) {
  const Icon = tool.icon
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-signal-dim to-transparent">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-signal opacity-[0.10] blur-3xl"
      />
      <div className="relative mx-auto flex max-w-7xl items-center gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-3">
            {Icon && (
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-panel text-signal shadow-card">
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
            )}
            <StampBadge formats={tool.formats} />
          </div>
          <h1 className="text-[clamp(1.6rem,3vw,2.3rem)] font-medium leading-[1.15] tracking-tight">{tool.name}</h1>
          {tool.description && (
            <p className="mt-2 max-w-[56ch] text-[0.95rem] leading-relaxed text-text-dim">{tool.description}</p>
          )}
        </div>
        <ProcessIllustration
          tool={tool}
          className="pointer-events-none absolute -right-10 top-1/2 w-[340px] -translate-y-1/2 opacity-25 sm:static sm:w-[300px] sm:translate-y-0 sm:opacity-100 lg:w-[380px]"
        />
      </div>
    </section>
  )
}

function ToolSeoContent({ tool }) {
  const hasContent = tool.intro || (tool.howTo && tool.howTo.length) || (tool.faq && tool.faq.length)
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  if (!hasContent) return null

  return (
    <section className="mb-10 rounded-card bg-panel text-text-dim shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-[0.95rem] font-medium text-text">
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
        <div className="max-w-[68ch] px-5 pb-5">
          {tool.intro && <p className="mb-6 text-[0.9rem] leading-relaxed">{tool.intro}</p>}

          {tool.howTo && tool.howTo.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-2.5 text-[0.95rem] font-medium text-text">
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
              <h3 className="mb-2.5 text-[0.95rem] font-medium text-text">
                Frequently asked questions
              </h3>
              <div className="space-y-2">
                {tool.faq.map((item, i) => (
                  <details key={i} className="group rounded-xl bg-panel-raised px-4 py-3">
                    <summary className="cursor-pointer list-none text-[0.88rem] font-normal text-text marker:hidden">
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

  if (tool.comingSoon) {
    return <ComingSoonTool tool={tool} />
  }

  return (
    <>
      <ToolHero tool={tool} />
      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-card bg-panel p-4 shadow-card sm:p-6">{workspace}</div>
          <aside className="rounded-card bg-panel p-5 shadow-card lg:sticky lg:top-20">
            <div className="mb-4 text-[0.95rem] font-medium">Settings</div>
            <div className="flex flex-col gap-6">{settings}</div>
          </aside>
        </div>
        <div className="mt-10">
          <ToolSeoContent tool={tool} />
        </div>
      </div>
    </>
  )
}
