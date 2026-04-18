export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

export type CropRatioPreset = 'free' | '1:1' | '3:4' | '4:5' | '16:9'

export type ImageUploaderMode = 'logo' | 'favicon' | 'product' | 'generic'

export type ImageUploadPolicy = {
    mode: ImageUploaderMode
    allowedMimeTypes: readonly AllowedImageMimeType[]
    cropPresets: CropRatioPreset[]
    defaultPreset: CropRatioPreset
    requireSquare: boolean
    maxFileSizeMb?: number
}

export type ImageUploadPolicyInput = {
    mode?: ImageUploaderMode
    cropPresets?: CropRatioPreset[]
    defaultPreset?: CropRatioPreset
    maxFileSizeMb?: number
}

const MODE_DEFAULTS: Record<ImageUploaderMode, Omit<ImageUploadPolicy, 'mode'>> = {
    logo: {
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
        cropPresets: ['free', '1:1', '3:4', '4:5', '16:9'],
        defaultPreset: 'free',
        requireSquare: false
    },
    favicon: {
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
        cropPresets: ['1:1'],
        defaultPreset: '1:1',
        requireSquare: true
    },
    product: {
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
        cropPresets: ['free', '1:1', '3:4', '4:5', '16:9'],
        defaultPreset: '4:5',
        requireSquare: false,
        maxFileSizeMb: 5
    },
    generic: {
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
        cropPresets: ['free', '1:1', '3:4', '4:5', '16:9'],
        defaultPreset: 'free',
        requireSquare: false
    }
}

const dedupePresets = (presets: CropRatioPreset[]): CropRatioPreset[] => {
    const seen = new Set<CropRatioPreset>()
    const out: CropRatioPreset[] = []
    for (const preset of presets) {
        if (seen.has(preset)) continue
        seen.add(preset)
        out.push(preset)
    }
    return out
}

export const resolveImageUploadPolicy = (input: ImageUploadPolicyInput = {}): ImageUploadPolicy => {
    const mode = input.mode ?? 'generic'
    const defaults = MODE_DEFAULTS[mode]

    const configuredPresets = input.cropPresets && input.cropPresets.length > 0 ? input.cropPresets : defaults.cropPresets
    const cropPresets = dedupePresets(configuredPresets)

    const defaultPreset = cropPresets.includes(input.defaultPreset as CropRatioPreset)
        ? (input.defaultPreset as CropRatioPreset)
        : cropPresets.includes(defaults.defaultPreset)
          ? defaults.defaultPreset
          : cropPresets[0]

    return {
        mode,
        allowedMimeTypes: defaults.allowedMimeTypes,
        cropPresets,
        defaultPreset,
        requireSquare: defaults.requireSquare,
        maxFileSizeMb: input.maxFileSizeMb ?? defaults.maxFileSizeMb
    }
}

export const bytesFromMb = (mb: number): number => Math.max(0, Math.floor(mb * 1024 * 1024))

export const isAllowedImageMimeType = (
    mimeType: string,
    allowed: ReadonlyArray<string> = ALLOWED_IMAGE_MIME_TYPES
): boolean => allowed.includes(mimeType)

export const formatMaxFileSizeLabel = (mb: number): string => `${mb} MB`

export const CROP_PRESET_RATIO: Record<Exclude<CropRatioPreset, 'free'>, number> = {
    '1:1': 1,
    '3:4': 3 / 4,
    '4:5': 4 / 5,
    '16:9': 16 / 9
}
