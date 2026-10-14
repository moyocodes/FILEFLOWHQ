import { useId } from 'react'

/*
 * Decorative "what this tool does" illustration: a source file flowing
 * through the tool into an output file, labelled with the tool's own formats
 * (e.g. SVG → PNG). The file glyphs change by category so image, document and
 * scanner tools each look like their process. Pure inline SVG themed with the
 * CSS colour tokens, so it works offline and in both themes. Animation is CSS
 * (see .flow-* in index.css) and stops under prefers-reduced-motion.
 */

function ImageGlyph({ x, y, w, h }) {
  return (
    <g>
      <circle cx={x + w * 0.3} cy={y + h * 0.3} r={w * 0.09} fill="var(--signal)" opacity="0.55" />
      <path
        d={`M${x + w * 0.12} ${y + h * 0.82} L${x + w * 0.4} ${y + h * 0.5} L${x + w * 0.58} ${y + h * 0.68} L${x + w * 0.72} ${y + h * 0.56} L${x + w * 0.88} ${y + h * 0.82} Z`}
        fill="var(--signal)"
        opacity="0.35"
      />
    </g>
  )
}

function DocGlyph({ x, y, w, h }) {
  return (
    <g fill="var(--text-dim)" opacity="0.35">
      {[0.22, 0.36, 0.5, 0.64].map((f, i) => (
        <rect key={f} x={x + w * 0.16} y={y + h * f} width={w * (i === 3 ? 0.42 : 0.68)} height={h * 0.05} rx={h * 0.025} />
      ))}
    </g>
  )
}

function QrGlyph({ x, y, w, h }) {
  const cells = [
    [0, 0], [1, 0], [3, 0], [0, 1], [2, 1], [3, 1], [1, 2], [3, 2], [0, 3], [1, 3], [2, 3]
  ]
  const s = Math.min(w, h) * 0.15
  const ox = x + (w - s * 4) / 2
  const oy = y + (h - s * 4) / 2.4
  return (
    <g fill="var(--text)" opacity="0.4">
      {cells.map(([cx, cy]) => (
        <rect key={`${cx}-${cy}`} x={ox + cx * s} y={oy + cy * s} width={s * 0.86} height={s * 0.86} rx={s * 0.15} />
      ))}
    </g>
  )
}

function FileCard({ x, y, w, h, label, kind, accent }) {
  const Glyph = kind === 'images' ? ImageGlyph : kind === 'utilities' ? QrGlyph : DocGlyph
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.12} fill="var(--panel)" />
      <rect x={x} y={y} width={w} height={h} rx={w * 0.12} fill={accent ? 'var(--signal-dim)' : 'transparent'} />
      <Glyph x={x} y={y} w={w} h={h * 0.8} />
      {label && (
        <g>
          <rect x={x + w * 0.14} y={y + h * 0.8} width={w * 0.72} height={h * 0.14} rx={h * 0.07} fill={accent ? 'var(--signal)' : 'var(--panel-raised)'} />
          <text
            x={x + w / 2}
            y={y + h * 0.895}
            textAnchor="middle"
            fontSize={h * 0.085}
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
            fill={accent ? 'var(--void)' : 'var(--text-dim)'}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  )
}

export default function ProcessIllustration({ tool, className = '' }) {
  const id = useId().replace(/:/g, '')
  const [from = 'FILE', to = from] = tool.formats || []
  const kind = tool.category
  const Icon = tool.icon

  return (
    <svg viewBox="0 0 360 200" className={className} aria-hidden="true" focusable="false">
      <defs>
        <filter id={`sh-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#101828" floodOpacity="0.14" />
        </filter>
        <linearGradient id={`flow-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--signal)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* flow path */}
      <path d="M92 100 C 130 60, 150 60, 180 100 S 230 140, 268 100" fill="none" stroke={`url(#flow-${id})`} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9" className="flow-dash" />

      {/* particles travelling along the path */}
      {[0, 1, 2].map((i) => (
        <circle key={i} r="4" fill="var(--signal)" className="flow-dot" style={{ offsetPath: "path('M92 100 C 130 60, 150 60, 180 100 S 230 140, 268 100')", animationDelay: `${i * 0.9}s` }} />
      ))}

      <g filter={`url(#sh-${id})`}>
        {/* source: slightly tilted */}
        <g transform="rotate(-8 56 100)">
          <FileCard x={20} y={52} w={72} h={96} label={from} kind={kind} />
        </g>

        {/* tool hub */}
        <circle cx="180" cy="100" r="30" fill="var(--panel)" />
        <circle cx="180" cy="100" r="30" fill="var(--signal-dim)" />
        <circle cx="180" cy="100" r="38" fill="none" stroke="var(--signal)" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 6" className="flow-spin" style={{ transformOrigin: '180px 100px' }} />
        {Icon && (
          <foreignObject x="164" y="84" width="32" height="32">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'var(--signal)', display: 'flex' }}>
              <Icon width={32} height={32} strokeWidth={1.75} />
            </div>
          </foreignObject>
        )}

        {/* output: upright, accented */}
        <FileCard x={268} y={48} w={76} h={104} label={to} kind={kind} accent />
      </g>
    </svg>
  )
}
