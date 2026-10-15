import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, fontFamily, mono } from './brand.js'

/*
 * Building blocks for FileFlowHQ motion videos. Everything is driven by
 * useCurrentFrame() (never CSS/timer animations) so renders are deterministic.
 */

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }

/** Near-black background with the logo's horizontal "speed lines" streaking past. */
export function Backdrop({ lines = 9, opacity = 0.55 }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(60% 50% at 50% 45%, ${C.mintDim}, transparent 70%)` }}
      />
      {Array.from({ length: lines }, (_, i) => {
        const len = 120 + ((i * 97) % 220)
        const speed = 9 + ((i * 7) % 11)
        const span = width + len * 2
        const x = ((frame * speed + i * 263) % span) - len
        const y = ((i + 0.5) / lines) * height + Math.sin(i * 3.1) * 40
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: len,
              height: 2,
              opacity,
              background: `linear-gradient(90deg, transparent, ${C.mint}, transparent)`
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

/** Headline in the video's style: white words, one mint keyword, words rising in one by one. */
export function KineticTitle({ parts, start = 0, size = 76, weight = 600 }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [before, accent, after] = parts
  const words = [
    ...before.split(/(?<= )/).filter(Boolean).map((w) => ({ w, mint: false })),
    ...accent.split(/(?<= )/).filter(Boolean).map((w) => ({ w, mint: true })),
    ...after.split(/(?<= )/).filter(Boolean).map((w) => ({ w, mint: false }))
  ]
  return (
    <div
      style={{
        fontFamily,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: '-0.025em',
        lineHeight: 1.1,
        color: C.text,
        textAlign: 'center',
        whiteSpace: 'pre-wrap'
      }}
    >
      {words.map(({ w, mint }, i) => {
        const s = spring({ frame: frame - start - i * 4, fps, config: { damping: 18, stiffness: 120 } })
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: s,
              transform: `translateY(${(1 - s) * 40}px)`,
              color: mint ? C.mint : C.text,
              fontWeight: mint ? 700 : weight
            }}
          >
            {w}
          </span>
        )
      })}
    </div>
  )
}

function Glyph({ kind }) {
  if (kind === 'image') {
    return (
      <svg viewBox="0 0 100 80" width="70%">
        <circle cx="30" cy="24" r="9" fill={C.mint} opacity="0.6" />
        <path d="M8 72 L38 40 L56 58 L70 46 L92 72 Z" fill={C.mint} opacity="0.4" />
      </svg>
    )
  }
  if (kind === 'data') {
    return (
      <div style={{ fontFamily: mono, fontSize: 30, color: C.mint, opacity: 0.7, lineHeight: 1.3 }}>
        {'{ }'}
        <br />
        {'[ , ]'}
      </div>
    )
  }
  return (
    <div style={{ width: '70%' }}>
      {[0.9, 0.7, 0.85, 0.55].map((w, i) => (
        <div key={i} style={{ height: 8, width: `${w * 100}%`, borderRadius: 4, background: C.dim, opacity: 0.35, marginBottom: 12 }} />
      ))}
    </div>
  )
}

/** A file card with a format label, like the floating cards in the launch video. */
export function FileCard({ label, kind, accent = false, width = 220, style }) {
  const height = width * 1.3
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.1,
        background: accent ? `linear-gradient(160deg, ${C.raised}, ${C.panel})` : C.panel,
        boxShadow: accent
          ? `0 30px 80px -20px rgba(59,230,152,0.45), inset 0 0 0 1px rgba(59,230,152,0.25)`
          : '0 30px 70px -25px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: height * 0.08,
        ...style
      }}
    >
      <Glyph kind={kind} />
      <div
        style={{
          fontFamily: mono,
          fontWeight: 700,
          fontSize: width * 0.11,
          padding: `${width * 0.025}px ${width * 0.07}px`,
          borderRadius: 999,
          background: accent ? C.mint : C.raised,
          color: accent ? C.bg : C.dim
        }}
      >
        {label}
      </div>
    </div>
  )
}

/** Dark app window chrome (traffic lights + fileflowhq.com pill). */
export function AppWindow({ title, badge = 'FREE · PRIVATE', width = 1100, children, style }) {
  return (
    <div
      style={{
        width,
        borderRadius: 28,
        overflow: 'hidden',
        background: C.panel,
        boxShadow: '0 60px 140px -40px rgba(59,230,152,0.35), 0 40px 80px -30px rgba(0,0,0,0.9)',
        fontFamily,
        color: C.text,
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', background: C.raised }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.75 }} />
        ))}
        <div style={{ margin: '0 auto', padding: '4px 18px', borderRadius: 999, background: C.panel, color: C.dim, fontFamily: mono, fontSize: 16 }}>
          fileflowhq.com
        </div>
      </div>
      <div style={{ padding: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <span style={{ fontSize: 34, fontWeight: 600 }}>{title}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.mint, background: C.mintDim, padding: '5px 12px', borderRadius: 999 }}>{badge}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Closing card: wordmark, tagline, URL pill — the launch video's last shot. */
export function EndCard({ start, url = 'fileflowhq.com' }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - start, fps, config: { damping: 16 } })
  const t = spring({ frame: frame - start - 8, fps, config: { damping: 18 } })
  const p = spring({ frame: frame - start - 16, fps, config: { damping: 14 } })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 34, fontFamily }}>
      <Img src={staticFile('logofull.svg')} style={{ width: 620, opacity: s, transform: `scale(${0.85 + s * 0.15})` }} />
      <div style={{ opacity: t, transform: `translateY(${(1 - t) * 20}px)`, textAlign: 'center', color: C.text, fontSize: 40, fontWeight: 600, lineHeight: 1.25 }}>
        Free, <span style={{ color: C.mint, fontWeight: 700 }}>private</span> file conversion.
        <br />
        <span style={{ fontWeight: 300, color: C.dim }}>Right in your browser.</span>
      </div>
      <div
        style={{
          opacity: p,
          transform: `scale(${0.8 + p * 0.2})`,
          fontFamily: mono,
          fontSize: 26,
          fontWeight: 700,
          padding: '12px 28px',
          borderRadius: 999,
          background: C.mint,
          color: C.bg
        }}
      >
        {url}
      </div>
    </AbsoluteFill>
  )
}

/** Fade a whole scene in/out over `fade` frames at its edges. */
export function Scene({ from, to, fade = 10, children }) {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [from, from + fade, to - fade, to], [0, 1, 1, 0], clamp)
  if (frame < from || frame > to) return null
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}
