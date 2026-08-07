import { X, FileText, CheckCircle2 } from 'lucide-react'
import { formatBytes } from '../utils/fileHelpers.js'

/**
 * One row in a file queue list.
 * Props: name, size, thumbnail (optional object URL), status ('idle'|'done'),
 * onRemove, rightSlot (extra node rendered on the right, e.g. a download link)
 */
export default function FileRow({ name, size, thumbnail, status = 'idle', onRemove, rightSlot }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-panel px-3 py-2.5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-panel-raised">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-4 w-4 text-text-dim" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-text-dim">{formatBytes(size)}</p>
      </div>
      {status === 'done' && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />}
      {rightSlot}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      )}
    </div>
  )
}
