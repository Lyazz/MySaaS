import type { Request, Response } from 'express'

import { AuthService, AuthServiceError } from './auth.service'

const service = new AuthService()

const sendAuthError = (res: Response, error: unknown): boolean => {
    if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
            statusCode: error.statusCode,
            statusMessage: error.statusMessage
        })
        return true
    }

    return false
}

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const result = await service.register(req.body ?? {}, req.tenant)
            res.json(result)
        } catch (error) {
            if (sendAuthError(res, error)) return
            console.error('Registration error:', error)
            res.status(500).json({
                statusCode: 500,
                statusMessage: 'Internal Server Error'
            })
        }
    }

    async login(req: Request, res: Response) {
        try {
            const result = await service.login(req.body ?? {}, req.tenant)
            res.json(result)
        } catch (error) {
            if (sendAuthError(res, error)) return
            console.error('Login error:', error)
            res.status(500).json({
                statusCode: 500,
                statusMessage: 'Internal Server Error'
            })
        }
    }

    async logout(req: Request, res: Response) {
        try {
            const result = await service.logout(req.user)
            res.json(result)
        } catch (error) {
            if (sendAuthError(res, error)) return
            console.error('Logout error:', error)
            res.status(500).json({
                statusCode: 500,
                statusMessage: 'Internal Server Error'
            })
        }
    }

    async me(req: Request, res: Response) {
        try {
            const result = await service.me(req.user)
            res.json(result)
        } catch (error) {
            if (sendAuthError(res, error)) return
            console.error('Me endpoint error:', error)
            res.status(500).json({
                statusCode: 500,
                statusMessage: 'Internal Server Error'
            })
        }
    }
}
