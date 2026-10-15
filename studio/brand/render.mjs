/**
 * Renders the FileFlowHQ logos (public/logo.svg, logofull.svg, logofull-light.svg) into raw RGBA
 * pixels for the shared editor brand component (studio/brand/ffhq_brand/mod.rs). Editors draw them
 * as egui textures, so they need no SVG or PNG decoder. Re-run after changing a logo:
 *   node studio/brand/render.mjs
 */
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'studio', 'brand', 'ffhq_brand')

// [source, output, height in pixels]: 2× the largest size the editors draw, for sharp HiDPI.
const LOGOS = [
  ['public/logo.svg', 'mark', 96],
  ['public/logofull.svg', 'wordmark-dark-ui', 112],
  ['public/logofull-light.svg', 'wordmark-light-ui', 112],
]

for (const [src, name, height] of LOGOS) {
  const { data, info } = await sharp(join(ROOT, src), { density: 600 }).resize({ height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  await writeFile(join(OUT, `${name}.rgba`), data)
  console.log(`${name}: ${info.width}×${info.height}`)
}
