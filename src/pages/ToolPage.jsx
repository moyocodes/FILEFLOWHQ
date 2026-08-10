import { useEffect, useLayoutEffect } from 'react'
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
      <div className="mb-5 flex flex-shrink-0 flex-wrap items-center gap-3">
        <h1 className="font-display text-[clamp(1.2rem,2vw,1.5rem)] tracking-wide">{tool.name}</h1>
        <StampBadge formats={tool.formats} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-[1rem] tracking-wide text-text">Under construction</p>
        <p className="max-w-sm text-[0.8rem] leading-relaxed text-text-dim">
          {tool.name} is still being built. Check back soon.
        </p>
      </div>
      <ToolSeoContent tool={tool} />
    </div>
  )
}

function ToolSeoContent({ tool }) {
  const hasContent = tool.intro || (tool.howTo && tool.howTo.length) || (tool.faq && tool.faq.length)
  if (!hasContent) return null

  return (
    <section className="mt-12 max-w-[68ch] border-t border-border pt-8 text-text-dim">
      {/* Keyword-rich heading for crawlers; the short tool name stays the visual h1 above. */}
      {tool.seoTitle && (
        <h2 className="font-display mb-3 text-[1.05rem] font-semibold tracking-wide text-text">
          {tool.seoTitle}
        </h2>
      )}

      {tool.intro && <p className="mb-6 text-[0.9rem] leading-relaxed">{tool.intro}</p>}

      {tool.howTo && tool.howTo.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-2.5 font-display text-[0.95rem] font-semibold tracking-wide text-text">
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
          <h3 className="mb-2.5 font-display text-[0.95rem] font-semibold tracking-wide text-text">
            Frequently asked questions
          </h3>
          <div className="space-y-2">
            {tool.faq.map((item, i) => (
              <details
                key={i}
                className="group rounded-lg border border-border bg-panel px-4 py-3"
              >
                <summary className="cursor-pointer list-none text-[0.88rem] font-medium text-text marker:hidden">
                  {item.q}
                </summary>
                <p className="mt-2 text-[0.85rem] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      )}
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
          `${tool.description} Free, private, and runs entirely in your browser — no uploads.`,
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
      <div className="mb-5 flex flex-shrink-0 flex-wrap items-center gap-3">
        <h1 className="font-display text-[clamp(1.2rem,2vw,1.5rem)] tracking-wide">{tool.name}</h1>
        <StampBadge formats={tool.formats} />
      </div>
      <div className="flex flex-1 flex-col">{workspace}</div>
      <ToolSeoContent tool={tool} />
    </div>
  )
}
