const isCombiningDiacritic = (codePoint: number) => codePoint >= 0x0300 && codePoint <= 0x036f

const stripDiacritics = (value: string) =>
    Array.from(value)
        .filter((ch) => !isCombiningDiacritic(ch.codePointAt(0) ?? 0))
        .join('')

export const normalizeLocationName = (value: unknown): string =>
    stripDiacritics(
        String(value ?? '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
    )
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
