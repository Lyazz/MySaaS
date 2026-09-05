/**
 * Normalize delivery-carrier logos into one uniform set of marks.
 *
 * Carrier artwork arrives in whatever shape the carrier publishes it: Maystro's
 * is a tall landscape lockup on white, Yalidine's is a square social avatar on
 * red. Dropped straight into a 30px plate, neither reads. This script turns any
 * source file into the same thing: a 256×256 PNG, trimmed of dead space, with
 * the mark centred and padded off the plate edge.
 *
 * Usage
 *   1. Drop the raw files (any format sharp reads) into public/images/carriers/_raw/
 *      named after the provider key, lowercased:  maystro.png  yalidine.jpg  …
 *   2. node scripts/normalize-carrier-logos.mjs
 *
 * The script prints each source's sampled corner colour — use it to set `tile`
 * in shared/admin/carrier-brand.ts so the plate matches the artwork's own
 * background seamlessly.
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const RAW_DIR = 'public/images/carriers/_raw'
const OUT_DIR = 'public/images/carriers'

const SIZE = 256
const PADDING = 18 // breathing room so the mark never touches the plate edge

/**
 * Per-carrier crop, applied before trimming, as fractions of the source box.
 * Lockups that stack a symbol above a wordmark get cropped down to the symbol —
 * the carrier's name already sits next to the plate in the UI, so repeating it
 * inside a 30px square only costs legibility.
 */
const CROPS = {
  // Maystro: isometric cube sits above the "MAYSTRO DELIVERY" wordmark.
  maystro: { top: 0, left: 0, width: 1, height: 0.58 }
  // Yalidine: already a square avatar designed to work at small sizes — no crop.
}

function toHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

async function sampleCorner(input) {
  const { data } = await sharp(input).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
  return toHex({ r: data[0], g: data[1], b: data[2] })
}

async function normalize(file) {
  const key = path.parse(file).name.toLowerCase()
  const input = path.join(RAW_DIR, file)
  const output = path.join(OUT_DIR, `${key}.png`)

  const meta = await sharp(input).metadata()
  let pipeline = sharp(input)

  const crop = CROPS[key]
  if (crop) {
    pipeline = pipeline.extract({
      left: Math.round(crop.left * meta.width),
      top: Math.round(crop.top * meta.height),
      width: Math.round(crop.width * meta.width),
      height: Math.round(crop.height * meta.height)
    })
  }

  const corner = await sampleCorner(input)

  // Re-open from the cropped buffer so trim() measures the crop, not the original.
  const cropped = await pipeline.png().toBuffer()

  await sharp(cropped)
    .trim()
    .resize(SIZE - PADDING * 2, SIZE - PADDING * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: PADDING,
      bottom: PADDING,
      left: PADDING,
      right: PADDING,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toFile(output)

  const out = await sharp(output).metadata()
  console.log(
    `${key.padEnd(10)} ${meta.width}×${meta.height} ${String(meta.format).padEnd(4)} → ${out.width}×${out.height} png   corner ${corner}`
  )
}

async function main() {
  if (!existsSync(RAW_DIR)) {
    console.error(`Missing ${RAW_DIR}. Create it and drop the raw carrier logos in, named after the provider key (maystro.png, yalidine.png).`)
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })

  const files = (await readdir(RAW_DIR)).filter((f) => /\.(png|jpe?g|webp|avif|tiff?|gif|svg)$/i.test(f))
  if (files.length === 0) {
    console.error(`No images in ${RAW_DIR}.`)
    process.exit(1)
  }

  for (const file of files) await normalize(file)

  console.log(`\n${files.length} mark(s) written to ${OUT_DIR}/ at ${SIZE}×${SIZE}.`)
  console.log('Set each carrier\'s `tile` in shared/admin/carrier-brand.ts to the corner colour above.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
