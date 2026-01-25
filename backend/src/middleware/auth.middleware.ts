import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export const expressAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Try to get Authorization header
    const authHeader = req.get('authorization')
    if (!authHeader) {
        return next()
    }

    // 2. Parse Bearer token
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
        return next()
    }

    // 3. Verify JWT
    try {
        const secret = process.env.JWT_SECRET || 'secret' // Should match routes.ts
        const decoded = jwt.verify(token, secret) as any

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
