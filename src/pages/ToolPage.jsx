import { useEffect, useLayoutEffect } from 'react'
import StampBadge from '../components/StampBadge.jsx'
import { useSettingsPanel } from '../context/SettingsPanelContext.jsx'
import { applySeo } from '../utils/useSeo.js'

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
    </div>
  )
}

export default function ToolPage({ tool }) {
  const useTool = tool.component
  const { workspace, settings } = useTool()
  const { setSettingsContent, clearSettingsContent } = useSettingsPanel()

  useEffect(() => {
    applySeo({
      title: tool.name,
      description: tool.comingSoon
        ? `${tool.name} is coming soon to FileFlowHQ — ${tool.description}`
        : `${tool.description} Free, private, and runs entirely in your browser — no uploads.`,
      path: tool.path
    })
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
    </div>
  )
}
