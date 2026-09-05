import { verifyAccessToken } from './jwt'

/**
 * A draft storefront (Tenant.publishedAt === null) is invisible to the public and
 * visible to its own team. Both gates -- the SSR one in server/middleware/tenant.ts
 * and the API one in subscription.middleware.ts -- ask this module the same
 * question so they cannot drift apart and leave one surface open.
 *
 * The browser carries the session as the `auth_token` cookie, not a Bearer
 * header, so the API gate cannot rely on `req.user`: expressAuthMiddleware reads
 * the Authorization header only. Deliberately kept to this one read-only
 * decision -- it grants sight of a draft store and nothing else -- rather than
 * teaching the whole API to accept cookie auth, which would hand every
 * state-changing endpoint a CSRF surface it does not have today.
 */

/** Paths that stay reachable on a draft tenant's host, so the merchant is never locked out. */
export const DRAFT_ALLOWED_PATH_PREFIXES = [
    '/admin',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
]

export const isDraftAllowedPath = (url: string): boolean =>
    DRAFT_ALLOWED_PATH_PREFIXES.some((prefix) => url.startsWith(prefix))

/** Reads one cookie out of a raw `Cookie:` header. No cookie-parser in this app. */
export const readCookie = (cookieHeader: string | undefined, name: string): string | null => {
    if (!cookieHeader) return null
    for (const part of cookieHeader.split(';')) {
        const index = part.indexOf('=')
        if (index === -1) continue
        if (part.slice(0, index).trim() !== name) continue
        try {
            return decodeURIComponent(part.slice(index + 1).trim())
        } catch {
            return part.slice(index + 1).trim()
        }
    }
    return null
}

/** True when the request carries a valid session belonging to this exact tenant. */
export const isTenantMemberToken = (token: string | null | undefined, tenantId: string): boolean => {
    if (!token) return false
    try {
        const payload = verifyAccessToken(token)
        return typeof payload === 'object' && payload !== null && (payload as any).tenantId === tenantId
    } catch {
        return false
    }
}

export const isTenantMemberByCookie = (cookieHeader: string | undefined, tenantId: string): boolean =>
    isTenantMemberToken(readCookie(cookieHeader, 'auth_token'), tenantId)
