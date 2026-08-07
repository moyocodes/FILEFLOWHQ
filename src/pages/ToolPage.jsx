import { useLayoutEffect } from 'react'
import StampBadge from '../components/StampBadge.jsx'
import { useSettingsPanel } from '../context/SettingsPanelContext.jsx'

/**
 * Generic tool route wrapper. Each tool in src/tools/ is a custom hook
 * (e.g. useImageConverter()) that owns all state/handlers and returns
 * { workspace, settings } JSX sharing that state closure. ToolPage calls
 * the hook, renders `workspace` inline (into the center pane it occupies),
 * and pushes `settings` up into the shell's right-hand settings pane via
 * SettingsPanelContext so App.jsx doesn't need to know about tool internals.
 */
export default function ToolPage({ tool }) {
  const useTool = tool.component
  const { workspace, settings } = useTool()
  const { setSettingsContent, clearSettingsContent } = useSettingsPanel()

  useLayoutEffect(() => {
    setSettingsContent(settings)
    return () => clearSettingsContent()
  }, [settings, setSettingsContent, clearSettingsContent])

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
