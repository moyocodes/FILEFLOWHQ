import { useRef, useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { UploadCloud } from 'lucide-react'

/**
 * Drag-and-drop file input with a "browse files" fallback button.
 *
 * Props:
 *  - accept: string for the native <input accept> attribute, e.g. "image/*"
 *  - multiple: allow selecting more than one file
 *  - onFiles: (FileList -> File[]) callback fired with the chosen files
 *  - hint: short helper text shown under the main label
 *  - compact: render a small pill instead of the full drop area — for tools
 *    where the loaded-file view (preview, controls, etc.) should take the
 *    space the big dropzone would otherwise occupy once a file is selected
 */
export default function Dropzone({ accept, multiple = false, onFiles, hint, compact = false }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || [])
      if (files.length > 0) onFiles(files)
    },
    [onFiles]
  )

  const sharedProps = {
    role: 'button',
    tabIndex: 0,
    onClick: () => inputRef.current?.click(),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
    },
    onDragOver: (e) => {
      e.preventDefault()
      setIsDragging(true)
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      className="hidden"
      onChange={(e) => {
        handleFiles(e.target.files)
        e.target.value = ''
      }}
    />
  )

  if (compact) {
    return (
      <div
        {...sharedProps}
        className={[
          'flex w-full cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-dashed px-4 py-2 text-left transition-colors',
          isDragging ? 'border-signal bg-signal-dim' : 'border-border-strong bg-panel hover:border-signal hover:bg-signal-dim'
        ].join(' ')}
      >
        <UploadCloud className="h-4 w-4 flex-shrink-0 text-text-dim" strokeWidth={2} />
        <span className="text-xs text-text-dim">
          Drop {multiple ? 'files' : 'a different file'} here or click to browse{hint ? ` · ${hint}` : ''}
        </span>
        {input}
      </div>
    )
  }

  return (
    <motion.div
      {...sharedProps}
      animate={
        prefersReducedMotion
          ? undefined
          : { scale: isDragging ? 1.01 : 1 }
      }
      transition={{ duration: 0.15 }}
      className={[
        'flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-[1.5px] border-dashed px-6 py-12 text-center transition-colors',
        isDragging ? 'border-signal bg-signal-dim' : 'border-border-strong bg-panel hover:border-signal hover:bg-signal-dim'
      ].join(' ')}
    >
      <UploadCloud className="h-[26px] w-[26px] text-text-dim" strokeWidth={2} />
      <div>
        <p className="text-[0.92rem] font-medium">Drop {multiple ? 'files' : 'a file'} here</p>
        <p className="mt-1 text-[0.76rem] text-text-dim">
          or click to browse — nothing leaves your device{hint ? ` · ${hint}` : ''}
        </p>
      </div>
      {input}
    </motion.div>
  )
}
