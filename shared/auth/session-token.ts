const decodeBase64Url = (value: string): string | null => {
    try {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
        const padLength = (4 - (normalized.length % 4)) % 4
        const padded = normalized.padEnd(normalized.length + padLength, '=')

        if (typeof atob === 'function') return atob(padded)
        const nodeBuffer = (globalThis as any).Buffer
        if (nodeBuffer) return nodeBuffer.from(padded, 'base64').toString('utf8')
        return null
    } catch {
        return null
    }
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const decoded = decodeBase64Url(parts[1] || '')
    if (!decoded) return null

    try {
        const parsed = JSON.parse(decoded)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        return parsed as Record<string, unknown>
    } catch {
        return null
    }
}

export const getJwtExpiryEpochMs = (token: string): number | null => {
    const payload = decodeJwtPayload(token)
    if (!payload) return null
    const exp = payload.exp
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return null
    return exp * 1000
}

export const isJwtExpired = (token: string, nowMs = Date.now(), leewaySeconds = 10): boolean => {
    const expMs = getJwtExpiryEpochMs(token)
    if (!expMs) return true
    return expMs <= nowMs + leewaySeconds * 1000
}
