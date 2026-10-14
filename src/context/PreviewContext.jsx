import { createContext, useCallback, useContext, useState } from 'react'

/**
 * Lets any tool show a converted file before it's downloaded:
 *   const { preview } = usePreview()
 *   preview({ blob, name, onDownload })
 * PreviewModal (rendered once in App) picks a renderer from the blob's type.
 */
const PreviewContext = createContext(null)

export function PreviewProvider({ children }) {
  const [current, setCurrent] = useState(null) // { blob, name, onDownload }
  const preview = useCallback((item) => setCurrent(item), [])
  const close = useCallback(() => setCurrent(null), [])
  return <PreviewContext.Provider value={{ current, preview, close }}>{children}</PreviewContext.Provider>
}

export function usePreview() {
  const ctx = useContext(PreviewContext)
  if (!ctx) throw new Error('usePreview must be used within a PreviewProvider')
  return ctx
}
