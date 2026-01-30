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

        if (decoded && decoded.userId) {
            // Optional: Fetch full user if needed, or just trust token payload for speed
            // For strict correctness, check if user still exists/active
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId }
            })

            if (user) {
                req.user = user
                // Also enforce tenant context if mismatch?
                // The middleware/tenant.ts sets req.context.tenant
                // We could check if user.tenantId === req.context.tenant.id
            }
        }
    } catch (e) {
        // invalid token
        console.error('Auth middleware error or invalid token')
    }

    next()
}
