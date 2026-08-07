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
 */
export default function Dropzone({ accept, multiple = false, onFiles, hint }) {
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

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
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
    </motion.div>
  )
}
