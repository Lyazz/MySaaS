/**
 * Fuzzy label matching for AI document import.
 *
 * Supplier invoices spell our products their own way — "CHOC. NOIR 100 GR",
 * "Chocolat noir 100g", "شوكولاتة سوداء". We cannot ask Postgres for this
 * without a pg_trgm extension, and a tenant's variant list is small enough
 * (a few thousand rows at the top plan) to score in Node once per job.
 *
 * Everything here is pure so it can be unit tested without a database.
 */

/**
 * Upper-cases, strips accents, and collapses everything that is not a letter or
 * digit into single spaces. Arabic and Latin both survive; punctuation, unit
 * spacing ("100 G" vs "100G") and case do not.
 */
export function normalizeLabel(value: unknown): string {
    if (typeof value !== 'string') return ''
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // combining marks left by NFD
        .toUpperCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
}

/** Normalized label with spaces removed — the key stored on SupplierProductAlias. */
export function aliasKey(value: unknown): string {
    return normalizeLabel(value).replace(/ /g, '')
}

const tokenize = (normalized: string): string[] => (normalized ? normalized.split(' ') : [])

/** Character bigrams of a token, or the token itself when it is a single char. */
const bigrams = (token: string): string[] => {
    if (token.length < 2) return [token]
    const out: string[] = []
    for (let i = 0; i < token.length - 1; i += 1) out.push(token.slice(i, i + 2))
    return out
}

/**
 * Score for one token pair.
 *
 * Bigrams alone under-score truncated abbreviations, and supplier invoices are
 * full of them — "CHOC." for "Chocolat", "TOURN." for "Tournesol". A token that
 * is a prefix of the other (three characters or more, so "L" does not match
 * "Lait") is treated as a near-match rather than left to the bigram overlap,
 * which sees only two of eight grams and calls it 0.4.
 */
const tokenScore = (a: string, b: string): number => {
    if (a === b) return 1
    const [short, long] = a.length <= b.length ? [a, b] : [b, a]
    if (short.length >= 3 && long.startsWith(short)) {
        // Longer shared prefixes are better evidence: "CHOCOL" beats "CHO".
        return 0.85 + 0.15 * (short.length / long.length)
    }
    return dice(bigrams(a), bigrams(b))
}

const dice = (a: string[], b: string[]): number => {
    if (!a.length || !b.length) return 0
    const counts = new Map<string, number>()
    for (const g of a) counts.set(g, (counts.get(g) ?? 0) + 1)

    let shared = 0
    for (const g of b) {
        const left = counts.get(g) ?? 0
        if (left > 0) {
            counts.set(g, left - 1)
            shared += 1
        }
    }
    return (2 * shared) / (a.length + b.length)
}

/**
 * Similarity in [0, 1] between two free-text labels.
 *
 * Blends a token-set overlap (so word order and extra words matter less) with a
 * whole-string bigram score (so "100G" vs "100GR" still scores high). Exact
 * matches after normalization return 1.
 */
export function similarity(left: unknown, right: unknown): number {
    const a = normalizeLabel(left)
    const b = normalizeLabel(right)
    if (!a || !b) return 0
    if (a === b) return 1

    const aTokens = tokenize(a)
    const bTokens = tokenize(b)

    // Token overlap: for each token on the shorter side, its best partner.
    const [short, long] = aTokens.length <= bTokens.length ? [aTokens, bTokens] : [bTokens, aTokens]
    let overlap = 0
    for (const token of short) {
        let best = 0
        for (const other of long) {
            const s = tokenScore(token, other)
            if (s > best) best = s
        }
        overlap += best
    }
    overlap = short.length ? overlap / short.length : 0

    // A one-word query matching a four-word title is weak evidence even when
    // that one word matches perfectly: a bare "Chocolat" could be any of them.
    // Scale the overlap by how much of the longer label the query covers, so
    // under-specified lines fall below the auto-match bar and get offered as
    // candidates instead of silently picked.
    const coverage = long.length ? short.length / long.length : 0
    overlap *= 0.7 + 0.3 * coverage

    const stringScore = dice(bigrams(a.replace(/ /g, '')), bigrams(b.replace(/ /g, '')))

    return Math.min(1, 0.6 * overlap + 0.4 * stringScore)
}

export interface MatchCandidate<T> {
    item: T
    score: number
}

/**
 * Top `limit` candidates for `query`, scored against each item's searchable
 * text, dropping anything below `minScore`. Ties keep input order, so an
 * upstream ordering (e.g. most recently used variant first) is preserved.
 */
export function rankCandidates<T>(
    query: unknown,
    items: readonly T[],
    toText: (item: T) => string,
    opts?: { limit?: number; minScore?: number }
): MatchCandidate<T>[] {
    const limit = opts?.limit ?? 3
    const minScore = opts?.minScore ?? 0.4
    if (!normalizeLabel(query)) return []

    const scored: MatchCandidate<T>[] = []
    for (const item of items) {
        const score = similarity(query, toText(item))
        if (score >= minScore) scored.push({ item, score })
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** At or above this score a fuzzy match is pre-selected instead of merely offered. */
export const AUTO_MATCH_THRESHOLD = 0.82
