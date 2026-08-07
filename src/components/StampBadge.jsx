import { ArrowRight } from 'lucide-react'

/**
 * Mono format-tag chip showing the "from format -> to format" transform a
 * tool performs, e.g. "PNG → WEBP".
 */
export default function StampBadge({ formats = [], size = 'md' }) {
  const [from, to] = formats
  const sizeClasses = size === 'sm' ? 'text-[0.6rem] px-1.5 py-0.5' : 'text-[0.68rem] px-[0.55rem] py-[0.28rem]'

  return (
    <div
      className={[
        'inline-flex items-center gap-1.5 rounded-[3px] border border-signal-dim bg-signal-dim font-mono font-medium uppercase tracking-wide text-mono-text',
        sizeClasses
      ].join(' ')}
    >
      <span>{from}</span>
      {to && (
        <>
          <ArrowRight className="h-3 w-3" strokeWidth={2.25} />
          <span>{to}</span>
        </>
      )}
    </div>
  )
}
