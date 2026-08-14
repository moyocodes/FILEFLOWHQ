import { createContext, useContext, useState, useCallback, useRef } from 'react'

/**
 * Lightweight toast queue. Call `showToast(message)` from anywhere; it stacks
 * with any toast already showing and each one auto-dismisses on its own timer.
 */
const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message, { duration = 3500 } = {}) => {
      idCounter += 1
      const id = idCounter
      setToasts((prev) => [...prev, { id, message }])
      const timer = setTimeout(() => dismissToast(id), duration)
      timers.current.set(id, timer)
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
