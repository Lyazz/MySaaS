import type { Request, Response, NextFunction } from 'express'

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user

    if (!user) {
        return res.status(401).json({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    if (!user.isSuperAdmin) {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: 'Access denied: Super Admin required'
        })
    }

    next()
}
