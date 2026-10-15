import { loadFont } from '@remotion/google-fonts/Poppins'

// Same look as the site and the launch video.
export const { fontFamily } = loadFont('normal', { weights: ['300', '400', '500', '600', '700'], subsets: ['latin'] })
export const mono = '"JetBrains Mono", "SF Mono", Menlo, monospace'

export const C = {
  bg: '#040608',
  panel: '#0b0f0f',
  raised: '#121918',
  mint: '#3be698',
  mintDim: 'rgba(59, 230, 152, 0.12)',
  text: '#eef3f1',
  dim: '#8b9894'
}

export const FPS = 30
