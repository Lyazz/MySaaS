import sharp from 'sharp'

export type OptimizedImage = {
    buffer: Buffer
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
    ext: '.png' | '.jpg' | '.webp'
}

const clampMaxDimension = (value: number, max: number) => (value > max ? max : value)

export const optimizeImage = async (args: {
    buffer: Buffer
    mimeType: string
    maxDimensionPx?: number
    profile?: 'product' | 'document'
}): Promise<OptimizedImage> => {
    const maxDimensionPx = clampMaxDimension(Math.max(256, Number(args.maxDimensionPx ?? 2000)), 6000)
    const profile = args.profile ?? 'product'

    const mimeType = args.mimeType
    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/webp') {
        throw new Error('Unsupported image type')
    }

    const base = sharp(args.buffer, { failOnError: false })
        .rotate()
        .resize({
            width: maxDimensionPx,
            height: maxDimensionPx,
            fit: 'inside',
            withoutEnlargement: true
        })

    if (mimeType === 'image/png') {
        const buffer = await base.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
        return { buffer, mimeType, ext: '.png' }
    }

    if (mimeType === 'image/jpeg') {
        const quality = profile === 'document' ? 90 : 82
        const chromaSubsampling = profile === 'document' ? '4:4:4' : '4:2:0'

        // MozJPEG-style output: fast to decode + good size/quality tradeoff.
        const buffer = await base
            .jpeg({ quality, mozjpeg: true, progressive: true, chromaSubsampling })
            .toBuffer()
        return { buffer, mimeType, ext: '.jpg' }
    }

    const webpQuality = profile === 'document' ? 90 : 82
    const buffer = await base.webp({ quality: webpQuality, effort: 4 }).toBuffer()
    return { buffer, mimeType, ext: '.webp' }
}
