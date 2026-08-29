import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { verifyAccessToken } from '../lib/jwt'

export const expressAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Try to get Authorization header
    const authHeader = req.get('authorization')
    if (!authHeader) {
        return next()
    }

    // 2. Parse Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (!match) {
        return next()
    }
    const token = match[1]?.trim()
    if (!token) return next()

    // 3. Verify JWT
    try {
        const decoded = verifyAccessToken(token) as any
        const issuedAt = typeof decoded?.iat === 'number' ? decoded.iat : null

        if (decoded && typeof decoded === 'object' && decoded.userId) {
            // Optional: Fetch full user if needed, or just trust token payload for speed
            // For strict correctness, check if user still exists/active
            const user = await prisma.user.findFirst({
                where: {
                    id: decoded.userId,
                    ...(decoded.tenantId ? { tenantId: decoded.tenantId } : {}),
                    isActive: true
                }
            })

            if (user) {
                const tokenInvalidBefore = (user as any).tokenInvalidBefore
                if (tokenInvalidBefore instanceof Date) {
                    const tokenInvalidBeforeSec = Math.floor(tokenInvalidBefore.getTime() / 1000)
                    if (!issuedAt || issuedAt <= tokenInvalidBeforeSec) {
                        return next()
                    }
                }

                // Device-bound sessions: tokens issued to the Flutter app carry
                // the device they were minted for. Revoking or transferring a
                // device bumps `Device.tokenVersion`, which retires every token
                // minted under the old one -- per-device revocation, without the
                // blast radius of `User.tokenInvalidBefore`, which kills every
                // session for that user across every device.
                //
                // Browser sessions carry no `deviceId` and are unaffected: the
                // web admin is deliberately not seat-limited.
                if (decoded.deviceId) {
                    const device = await prisma.device.findFirst({
                        where: {
                            id: decoded.deviceId,
                            ...(decoded.tenantId ? { tenantId: decoded.tenantId } : {})
                        }
                    })

                    if (!device || device.tokenVersion !== decoded.dv) {
                        return next()
                    }

                    // A revoked device may still drain writes it queued while
                    // offline, so revoking a terminal never destroys work the
                    // tenant already captured on it.
                    const canDrain =
                        device.drainUntil instanceof Date && device.drainUntil > new Date()

                    if (device.status !== 'ACTIVE' && !canDrain) {
                        return next()
                    }
                }

                req.user = user
                // Also enforce tenant context if mismatch?
                // The middleware/tenant.ts sets req.context.tenant
                // We could check if user.tenantId === req.context.tenant.id
            }
        }
    } catch (e) {
        // invalid token
        console.warn('Auth middleware: invalid token')
    }

    next()
}
