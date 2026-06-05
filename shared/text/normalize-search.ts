/**
 * Normalize a search string to enable fuzzy matching across:
 * - Arabic Alef variants (ا أ إ آ → ا)
 * - Arabic Teh Marbuta (ة → ه)
 * - Arabic Alef Maqsura (ى → ي)
 * - Arabic Tashkeel / harakat (stripped)
 * - Latin diacritics (é → e, ñ → n, ü → u, etc.)
 *
 * Apply to BOTH the query and the text being compared.
 *
 * @example
 * normalizeSearchText('أبل') === normalizeSearchText('آبل') // true
 * normalizeSearchText('café') === normalizeSearchText('cafe') // true
 */
export function normalizeSearchText(text: string): string {
    if (!text) return ''

    return (
        text
            // 1. Remove Latin diacritics: decompose to NFD then strip combining marks
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

            // 2. Unify Arabic Alef variants: أ إ آ ٱ → ا
            .replace(/[أإآٱ]/g, 'ا')

            // 3. Normalize Teh Marbuta: ة → ه
            .replace(/ة/g, 'ه')

            // 4. Normalize Alef Maqsura: ى → ي
            .replace(/ى/g, 'ي')

            // 5. Strip Arabic Tashkeel (harakat): fatha, damma, kasra, sukun, shadda, etc.
            .replace(/[\u064B-\u065F\u0670]/g, '')

            // 6. Lowercase (handles Latin characters)
            .toLowerCase()
    )
}
