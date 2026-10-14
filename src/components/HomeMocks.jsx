import { motion, useReducedMotion } from 'framer-motion'
import { Check, FileText, MousePointer2 } from 'lucide-react'

/*
 * Small, animated mock-ups of the real tools, styled after the scenes in the
 * launch video (dark app windows, mint accents). Pure markup + tokens — no
 * images — so they stay crisp and follow the light/dark theme.
 */

export function AppWindow({ title, badge, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-panel shadow-lift ${className}`}>
      <div className="flex items-center gap-1.5 bg-panel-raised px-4 py-2.5">
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full opacity-70" style={{ background: c }} />
        ))}
        <span className="mx-auto rounded-full bg-panel px-3 py-0.5 font-mono text-[0.62rem] text-text-dim">fileflowhq.com</span>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[1rem] font-semibold">{title}</span>
          {badge && <span className="rounded-full bg-signal-dim px-2 py-0.5 text-[0.6rem] font-semibold text-signal">{badge}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}

const inView = { once: true, amount: 0.4 }

export function CompressMock() {
  const reduce = useReducedMotion()
  const files = [
    ['beach.jpg', 0.78],
    ['receipt.png', 0.64],
    ['team.webp', 0.7]
  ]
  return (
    <AppWindow title="Image Compressor" badge="FREE · PRIVATE">
      <div className="mb-4 flex gap-1.5">
        {['100 KB', '250 KB', '500 KB', '1 MB'].map((t) => (
          <span
            key={t}
            className={`rounded-lg px-2.5 py-1 font-mono text-[0.65rem] ${t === '500 KB' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim'}`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="relative space-y-3.5">
        {/* target line */}
        <span className="absolute bottom-0 top-0 w-px" style={{ left: "80%", background: "var(--signal)", opacity: 0.5 }} />
        {files.map(([name, w], i) => (
          <div key={name}>
            <div className="mb-1 flex justify-between text-[0.72rem]">
              <span>{name}</span>
              <motion.span
                className="flex items-center gap-1 text-signal"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={inView}
                transition={{ delay: reduce ? 0 : 1 + i * 0.25 }}
              >
                <Check className="h-3 w-3" /> under target
              </motion.span>
            </div>
            <div className="h-2.5 rounded-full bg-panel-raised">
              <motion.div
                className="h-full rounded-full bg-signal"
                initial={{ width: '100%' }}
                whileInView={{ width: `${w * 100}%` }}
                viewport={inView}
                transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.2 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </AppWindow>
  )
}

export function MergeMock() {
  const reduce = useReducedMotion()
  const files = ['cover.pdf', 'q3-report.pdf', 'appendix.pdf']
  return (
    <AppWindow title="Merge / Split PDF" badge="FREE · PRIVATE">
      <div className="mb-3 inline-flex rounded-lg bg-panel-raised p-0.5 text-[0.68rem]">
        <span className="rounded-md bg-signal px-2.5 py-1 font-semibold text-void">Merge PDFs</span>
        <span className="px-2.5 py-1 text-text-dim">Split / extract pages</span>
      </div>
      <div className="space-y-2">
        {files.map((f, i) => (
          <motion.div
            key={f}
            className="flex items-center gap-2.5 rounded-xl bg-panel-raised px-3 py-2.5 text-[0.75rem]"
            initial={{ opacity: 0, x: reduce ? 0 : -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={inView}
            transition={{ delay: reduce ? 0 : 0.15 + i * 0.18 }}
          >
            <span className="rounded bg-signal-dim px-1.5 py-0.5 font-mono text-[0.55rem] font-bold text-signal">PDF</span>
            {f}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="relative rounded-xl bg-signal px-4 py-2 text-[0.75rem] font-semibold text-void">
          Merge PDFs
          <MousePointer2 className="absolute -bottom-3 -right-2 h-4 w-4 fill-white text-black" />
        </span>
        <motion.span
          className="flex items-center gap-1 text-[0.72rem] text-signal"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={inView}
          transition={{ delay: reduce ? 0 : 1 }}
        >
          <Check className="h-3.5 w-3.5" /> merged.pdf ready
        </motion.span>
      </div>
    </AppWindow>
  )
}

export function ScanMock() {
  return (
    <AppWindow title="Document Scanner" badge="CAMERA">
      <div className="flex gap-4">
        <div className="relative flex flex-1 items-center justify-center rounded-xl bg-black/60 py-6">
          <div className="relative h-36 w-28 -rotate-2 rounded-md bg-[#d9f7e8] p-3 shadow-card">
            {[0.9, 0.7, 0.85, 0.6, 0.8, 0.5].map((w, i) => (
              <span key={i} className="mb-2 block h-1.5 rounded bg-[#0b5f3f]/30" style={{ width: `${w * 100}%` }} />
            ))}
            <span className="scan-sweep absolute left-[-8%] h-0.5 w-[116%] bg-signal shadow-[0_0_12px_var(--signal)]" />
          </div>
          {/* corner guides */}
          {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map((c) => (
            <span key={c} className={`absolute h-4 w-4 rounded-sm border-signal ${c}`} />
          ))}
        </div>
        <div className="flex w-20 flex-col gap-2">
          <span className="text-[0.62rem] text-text-dim">Recent scans</span>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1.5 rounded-lg bg-panel-raised p-1.5">
              <FileText className="h-3.5 w-3.5 text-text-dim" />
              <span className="text-[0.6rem]">Page {n}</span>
            </div>
          ))}
          <span className="mt-auto rounded-lg bg-signal py-1.5 text-center text-[0.65rem] font-semibold text-void">Save PDF</span>
        </div>
      </div>
    </AppWindow>
  )
}
