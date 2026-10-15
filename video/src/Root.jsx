import { Composition, Folder } from 'remotion'
import { FPS } from './brand.js'
import { TOOLS } from './tools.js'
import { ToolPromo, PROMO_FRAMES } from './ToolPromo.jsx'
import { CompressorDemo, COMPRESSOR_FRAMES } from './CompressorDemo.jsx'

export function Root() {
  return (
    <>
      <Composition id="CompressorDemo" component={CompressorDemo} durationInFrames={COMPRESSOR_FRAMES} fps={FPS} width={1920} height={1080} />

      {/* One square promo per tool: Promo-svg-to-png, Promo-pdf-to-word, … */}
      <Folder name="Promos">
        {TOOLS.map((t) => (
          <Composition
            key={t.id}
            id={`Promo-${t.id}`}
            component={ToolPromo}
            durationInFrames={PROMO_FRAMES}
            fps={FPS}
            width={1080}
            height={1080}
            defaultProps={{ toolId: t.id }}
          />
        ))}
      </Folder>
    </>
  )
}
