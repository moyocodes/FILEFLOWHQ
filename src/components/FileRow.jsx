import { X, FileText, CheckCircle2, Pencil } from 'lucide-react'
import { formatBytes } from '../utils/fileHelpers.js'

/**
 * One row in a file queue list.
 * Props: name, size, thumbnail (optional object URL), status ('idle'|'done'),
 * onRemove, onRename (optional — if provided, name renders as an editable
 * text input instead of static text), rightSlot (extra node rendered on the
 * right, e.g. a download link)
 */
export default function FileRow({ name, size, thumbnail, status = 'idle', onRemove, onRename, rightSlot }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-panel px-3 py-2.5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-panel-raised">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-4 w-4 text-text-dim" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {onRename ? (
          <label className="group flex items-center gap-1.5 rounded border border-dashed border-border-strong bg-panel-raised px-1.5 py-0.5 focus-within:border-solid focus-within:border-signal">
            <input
              value={name}
              onChange={(e) => onRename(e.target.value)}
              aria-label="File name"
              className="w-full min-w-0 break-all bg-transparent text-sm font-medium leading-snug outline-none"
            />
            <Pencil className="h-3 w-3 flex-shrink-0 text-text-dim group-focus-within:text-signal" strokeWidth={2} />
          </label>
        ) : (
          <p className="break-all text-sm font-medium leading-snug">{name}</p>
        )}
        <p className="mt-0.5 text-xs text-text-dim">{formatBytes(size)}</p>
      </div>
      {status === 'done' && <CheckCircle2 className="mt-1.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />}
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
