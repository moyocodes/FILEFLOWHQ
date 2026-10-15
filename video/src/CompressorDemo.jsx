import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, fontFamily, mono } from './brand.js'
import { AppWindow, Backdrop, EndCard, KineticTitle, Scene, clamp } from './parts.jsx'

/*
 * 10-second 16:9 demo recreating the launch video's compressor scene: the
 * window tilts in, the cursor picks 500 KB, and each file's bar shrinks under
 * the target line before the end card.
 */
export const COMPRESSOR_FRAMES = 300

const FILES = [
  ['beach.jpg', '4.2 MB', '468 KB', 0.74],
  ['receipt.png', '2.8 MB', '391 KB', 0.62],
  ['team.webp', '3.5 MB', '455 KB', 0.71]
]
const TARGETS = ['100 KB', '250 KB', '500 KB', '1 MB']

export function CompressorDemo() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const win = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 70 } })
  const tiltY = interpolate(win, [0, 1], [-28, -10])
  const tiltX = interpolate(win, [0, 1], [18, 6])

  // cursor glides to the 500 KB chip and clicks at frame 95
  const cursorT = interpolate(frame, [60, 92], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) })
  const click = interpolate(frame, [92, 96, 102], [1, 0.82, 1], clamp)
  const picked = frame >= 95

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Backdrop />

      <Scene from={0} to={245}>
        <AbsoluteFill style={{ alignItems: 'center', paddingTop: 70 }}>
          <KineticTitle parts={['Compress to the ', 'size', ' you need.']} start={4} size={64} />
        </AbsoluteFill>

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 150, perspective: 1800 }}>
          <div style={{ opacity: win, transform: `translateY(${(1 - win) * 160}px) rotateY(${tiltY}deg) rotateX(${tiltX}deg)` }}>
            <AppWindow title="Image Compressor" width={1080}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 34, position: 'relative' }}>
                {TARGETS.map((t) => {
                  const on = picked && t === '500 KB'
                  return (
                    <div
                      key={t}
                      style={{
                        fontFamily: mono,
                        fontSize: 20,
                        padding: '8px 18px',
                        borderRadius: 12,
                        background: on ? C.mint : C.raised,
                        color: on ? C.bg : C.dim,
                        transform: t === '500 KB' ? `scale(${click})` : undefined
                      }}
                    >
                      {t}
                    </div>
                  )
                })}
                {/* cursor */}
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  style={{
                    position: 'absolute',
                    left: interpolate(cursorT, [0, 1], [700, 330]),
                    top: interpolate(cursorT, [0, 1], [180, 22]),
                    transform: `scale(${click})`,
                    opacity: interpolate(frame, [55, 62, 150, 160], [0, 1, 1, 0], clamp)
                  }}
                >
                  <path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" strokeWidth="1.2" />
                </svg>
              </div>

              <div style={{ position: 'relative' }}>
                {FILES.map(([name, before, after, w], i) => {
                  const start = 105 + i * 14
                  const shrink = spring({ frame: frame - start, fps, config: { damping: 20, stiffness: 60 } })
                  const done = frame > start + 35
                  return (
                    <div key={name} style={{ marginBottom: 26 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, marginBottom: 10 }}>
                        <span>{name}</span>
                        <span style={{ fontFamily: mono, fontSize: 18, color: done ? C.mint : C.dim }}>
                          {done ? `${before} → ${after}  ✓ under target` : before}
                        </span>
                      </div>
                      <div style={{ position: 'relative', height: 16, borderRadius: 8, background: C.raised }}>
                        {/* 500 KB target marker */}
                        <div style={{ position: 'absolute', top: -6, bottom: -6, left: '80%', width: 3, borderRadius: 2, background: C.text, opacity: 0.35 }} />
                        <div style={{ height: '100%', borderRadius: 8, background: C.mint, width: `${interpolate(shrink, [0, 1], [100, w * 100])}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </AppWindow>
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene from={240} to={COMPRESSOR_FRAMES + 10} fade={12}>
        <EndCard start={246} url="fileflowhq.com/tools/image-compressor" />
      </Scene>
    </AbsoluteFill>
  )
}
