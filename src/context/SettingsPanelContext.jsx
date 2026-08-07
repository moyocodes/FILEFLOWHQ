import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Lets a tool page (rendered inside the center workspace pane) push JSX
 * content up into the sibling settings pane (right column of the shell)
 * without lifting all tool state into App.jsx.
 *
 * ToolPage calls `setSettingsContent(jsx)` in a layout effect; App's
 * settings pane reads `settingsContent` and renders it.
 */
const SettingsPanelContext = createContext(null)

export function SettingsPanelProvider({ children }) {
  const [settingsContent, setSettingsContent] = useState(null)

  const clearSettingsContent = useCallback(() => setSettingsContent(null), [])

  return (
    <SettingsPanelContext.Provider value={{ settingsContent, setSettingsContent, clearSettingsContent }}>
      {children}
    </SettingsPanelContext.Provider>
  )
}

export function useSettingsPanel() {
  const ctx = useContext(SettingsPanelContext)
  if (!ctx) throw new Error('useSettingsPanel must be used within a SettingsPanelProvider')
  return ctx
}
