// Renders the PWA icon set from the same open-book artwork as favicon.svg.
//
// Hand-rolled rather than using a preset because the three icon purposes need genuinely
// different framing, and a single source image can't satisfy all of them:
//   - "any"     — rounded-rect badge, matches the favicon
//   - maskable  — full-bleed background, artwork shrunk into the centre so it survives the
//                 circular crop Android may apply (safe zone is the middle 80%)
//   - apple     — full-bleed and fully opaque; iOS applies its own rounded mask and renders
//                 any transparency as black
//
// Run with: node scripts/generate-pwa-icons.mjs

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

// fileURLToPath, not URL.pathname — the project path contains characters that get
// percent-encoded in a URL, which sharp then can't open.
const OUT_DIR = fileURLToPath(new URL('../public/', import.meta.url))
const EMERALD = '#059669'

// The book glyph, drawn on a 64x64 grid so it matches favicon.svg exactly.
const book = `
  <path d="M32 20c-3.5-3-8.5-4-13-3v26c4.5-1 9.5 0 13 3V20z" fill="#ffffff"/>
  <path d="M32 20c3.5-3 8.5-4 13-3v26c-4.5-1-9.5 0-13 3V20z" fill="#d1fae5"/>
  <rect x="31" y="18" width="2" height="30" fill="${EMERALD}"/>
`

/** Rounded-rect badge on a transparent canvas — the "any" purpose icon. */
function roundedIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${EMERALD}"/>
  ${book}
</svg>`
}

/**
 * Full-bleed square with the artwork scaled down and centred.
 * @param scale fraction of the canvas the artwork should occupy
 */
function fullBleedIcon(scale) {
  const size = 64 * scale
  const offset = (64 - size) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${EMERALD}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${book}</g>
</svg>`
}

const targets = [
  { name: 'pwa-192x192.png', size: 192, svg: roundedIcon() },
  { name: 'pwa-512x512.png', size: 512, svg: roundedIcon() },
  // 0.55 keeps the glyph inside the middle-80% maskable safe zone with room to spare.
  { name: 'maskable-icon-512x512.png', size: 512, svg: fullBleedIcon(0.55) },
  // iOS crops less aggressively, so the glyph can sit larger.
  { name: 'apple-touch-icon.png', size: 180, svg: fullBleedIcon(0.7) },
]

await mkdir(OUT_DIR, { recursive: true })

for (const { name, size, svg } of targets) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, name))
  console.log(`wrote ${name} (${size}x${size})`)
}
