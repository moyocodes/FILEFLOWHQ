// Render every tool promo plus the compressor demo into video/out/.
import { execSync } from 'node:child_process'
import { TOOLS } from './src/tools.js'

const ids = ['CompressorDemo', ...TOOLS.map((t) => `Promo-${t.id}`)]
for (const id of ids) {
  console.log(`\n▶ ${id}`)
  execSync(`npx remotion render src/index.js ${id} out/${id}.mp4`, { stdio: 'inherit' })
}
