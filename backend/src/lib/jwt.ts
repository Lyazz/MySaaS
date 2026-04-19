import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'

const DEFAULT_ACCESS_TOKEN_TTL: SignOptions['expiresIn'] = '7d'

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
}

const getAccessTokenTtl = (): SignOptions['expiresIn'] => {
    const configured = process.env.JWT_ACCESS_TOKEN_TTL?.trim()
    if (configured) return configured as SignOptions['expiresIn']
    return DEFAULT_ACCESS_TOKEN_TTL
}

export const signAccessToken = (payload: object, opts?: Omit<SignOptions, 'algorithm'>): string => {
    return jwt.sign(payload, getJwtSecret(), {
        algorithm: 'HS256',
        expiresIn: getAccessTokenTtl(),
        ...opts
    })
}

export const verifyAccessToken = (token: string): JwtPayload | string => {
    return jwt.verify(token, getJwtSecret(), {
        algorithms: ['HS256']
    })
}
