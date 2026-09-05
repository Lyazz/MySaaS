export function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback

    const e = error as {
        message?: unknown
        statusMessage?: unknown
        data?: {
            statusMessage?: unknown
            message?: unknown
        }
        response?: {
            data?: {
                statusMessage?: unknown
                message?: unknown
            }
        }
    }

    const candidates = [
        e.data?.statusMessage,
        e.data?.message,
        e.response?.data?.statusMessage,
        e.response?.data?.message,
        e.statusMessage,
        e.message
    ]

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate
        }
    }

    return fallback
}
