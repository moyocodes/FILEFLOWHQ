import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import { isNative, isExtension } from './platform'

/**
 * Captures the browser's beforeinstallprompt event (Chrome, Edge, Android) at
 * module load, so it isn't missed if it fires before React mounts, and lets any
 * component trigger the native one-click install. Browsers without the event
 * (iOS Safari, Firefox) never get canInstall, so nothing is shown there.
 */
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn(!!deferredPrompt))

if (typeof window !== 'undefined' && !isNative && !isExtension) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
    track('pwa_installed')
  })
}

/** Show the native install dialog. Resolves to 'accepted', 'dismissed' or null. */
export async function promptInstall() {
  if (!deferredPrompt) return null
  const e = deferredPrompt
  e.prompt()
  const { outcome } = await e.userChoice
  track('pwa_install_prompt', { outcome })
  // The event can only be used once.
  deferredPrompt = null
  notify()
  return outcome
}

export function useCanInstall() {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt)
  useEffect(() => {
    listeners.add(setCanInstall)
    setCanInstall(!!deferredPrompt)
    return () => listeners.delete(setCanInstall)
  }, [])
  return canInstall
}
