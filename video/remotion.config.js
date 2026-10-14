import { Config } from '@remotion/cli/config'

// Reuse the website's public/ folder (logos, poster, etc.) via staticFile().
Config.setPublicDir('../public')
Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
