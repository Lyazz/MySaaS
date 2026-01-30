import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
}

export const signAccessToken = (payload: object, opts?: Omit<SignOptions, 'algorithm'>): string => {
    return jwt.sign(payload, getJwtSecret(), {
        algorithm: 'HS256',
        expiresIn: '24h',
        ...opts
    })
}

export const verifyAccessToken = (token: string): JwtPayload | string => {
    return jwt.verify(token, getJwtSecret(), {
        algorithms: ['HS256']
    })
}

