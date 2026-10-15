import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, fontFamily } from './brand.js'
import { Backdrop, EndCard, FileCard, KineticTitle, Scene, clamp } from './parts.jsx'
import { TOOLS } from './tools.js'

/*
 * 8-second square promo for one tool (feeds, stories, ads):
 *   0–2.5s  headline types in ("Compress to the size you need.")
 *   1.5–6s  the source file flies through the tool hub and comes out converted
 *   6–8s    end card with the tool's URL
 */
export const PROMO_FRAMES = 240

export function ToolPromo({ toolId }) {
  const tool = TOOLS.find((t) => t.id === toolId) || TOOLS[0]
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  // headline slides up to make room for the conversion
  const lift = interpolate(frame, [55, 80], [0, -300], clamp)

  const srcIn = spring({ frame: frame - 45, fps, config: { damping: 15 } })
  const travel = interpolate(frame, [90, 130], [0, 1], { ...clamp, easing: (t) => t * t * (3 - 2 * t) })
  const outIn = spring({ frame: frame - 125, fps, config: { damping: 12, stiffness: 140 } })
  const hubIn = spring({ frame: frame - 70, fps, config: { damping: 14 } })
  const ring = frame * 2.2
  const pulse = interpolate(frame, [118, 128, 140], [1, 1.25, 1], clamp)

  const cx = width / 2
  const cy = height / 2 + 120
  const srcX = interpolate(travel, [0, 1], [cx - 330, cx - 40])
  const srcScale = interpolate(travel, [0.6, 1], [1, 0.2], clamp)
  const srcOpacity = interpolate(travel, [0.7, 1], [1, 0], clamp)

  const ready = spring({ frame: frame - 150, fps, config: { damping: 16 } })

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Backdrop />

      <Scene from={0} to={185}>
        <AbsoluteFill style={{ justifyContent: 'center', padding: 90, transform: `translateY(${lift}px)` }}>
          <KineticTitle parts={tool.headline} start={6} size={84} />
        </AbsoluteFill>

        {/* source file */}
        <div
          style={{
            position: 'absolute',
            left: srcX - 110,
            top: cy - 143,
            opacity: srcIn * srcOpacity,
            transform: `translateY(${(1 - srcIn) * 80}px) rotate(${-8 + travel * 8}deg) scale(${srcScale})`
          }}
        >
          <FileCard label={tool.from} kind={tool.kind} />
        </div>

        {/* tool hub */}
        <div
          style={{
            position: 'absolute',
            left: cx - 70,
            top: cy - 70,
            width: 140,
            height: 140,
            borderRadius: 70,
            background: C.panel,
            boxShadow: `0 0 ${60 * pulse}px rgba(59,230,152,${0.35 * pulse})`,
            opacity: hubIn,
            transform: `scale(${hubIn * pulse})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -18,
              borderRadius: 999,
              border: `3px dashed rgba(59,230,152,0.45)`,
              transform: `rotate(${ring}deg)`
            }}
          />
          <span style={{ color: C.mint, fontSize: 54, fontWeight: 700 }}>→</span>
        </div>

        {/* converted file */}
        <div
          style={{
            position: 'absolute',
            left: cx + 330 - 120,
            top: cy - 156,
            opacity: outIn,
            transform: `translateX(${(1 - outIn) * -200}px) scale(${0.6 + outIn * 0.4})`
          }}
        >
          <FileCard label={tool.to} kind={tool.kind} accent width={240} />
        </div>

        {/* ready badge */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: cy + 220,
            textAlign: 'center',
            opacity: ready,
            transform: `translateY(${(1 - ready) * 20}px)`,
            color: C.mint,
            fontSize: 34,
            fontWeight: 600
          }}
        >
          ✓ Ready — never left your device
        </div>
      </Scene>

      <Scene from={180} to={PROMO_FRAMES + 10} fade={12}>
        <EndCard start={186} url={`fileflowhq.com/tools/${tool.id}`} />
      </Scene>
    </AbsoluteFill>
  )
}
