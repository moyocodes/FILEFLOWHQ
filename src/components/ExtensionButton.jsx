import { Puzzle } from 'lucide-react'
import { isExtension, isNative } from '../utils/platform'

/**
 * Chrome Web Store listing for the FileFlowHQ extension. Chrome removed inline
 * installs, so the closest to one click is opening the listing, where "Add to
 * Chrome" is a single button. VITE_CHROME_EXTENSION_URL overrides the listing URL.
 */
// Same published extension ID that api/_cors.js allows.
export const CHROME_EXTENSION_URL =
  import.meta.env.VITE_CHROME_EXTENSION_URL || 'https://chromewebstore.google.com/detail/gjfjbeejnohhebifklghhhmdgjgbcbmf'

/** Desktop Chromium browsers can install Web Store extensions; phones can't. */
function canInstallChromeExtension() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const isChromium = /Chrome\//.test(ua) || /Edg\//.test(ua)
  return isChromium && !isMobile
}

export default function ExtensionButton({ variant = 'nav' }) {
  if (!CHROME_EXTENSION_URL || isExtension || isNative || !canInstallChromeExtension()) return null

  const className =
    variant === 'hero'
      ? 'inline-flex items-center gap-2 rounded-full bg-panel px-5 py-3 text-[0.9rem] font-semibold text-text shadow-card transition-transform hover:-translate-y-0.5'
      : 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.85rem] font-medium text-text-dim transition-colors hover:bg-panel-raised hover:text-text'

  return (
    <a href={CHROME_EXTENSION_URL} target="_blank" rel="noopener noreferrer" className={className}>
      <Puzzle className={variant === 'hero' ? 'h-4 w-4 text-signal' : 'h-3.5 w-3.5'} strokeWidth={2} />
      Add to Chrome
    </a>
  )
}
