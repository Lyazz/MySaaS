import jwt from 'jsonwebtoken'

type LocalFileTokenPayload = {
    kind: 'local-file'
    key: string
    mimeType: string
}

const requireJwtSecret = () => {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET missing')
    return secret
}

export const signLocalFileToken = (args: { key: string; mimeType: string; expiresInSeconds?: number }) => {
    const expiresInSeconds = Math.max(15, Math.min(60 * 10, Number(args.expiresInSeconds ?? 60 * 2)))
    const secret = requireJwtSecret()

    const payload: LocalFileTokenPayload = {
        kind: 'local-file',
        key: args.key,
        mimeType: args.mimeType
    }

    return jwt.sign(payload, secret, { expiresIn: expiresInSeconds })
}

export const verifyLocalFileToken = (token: string): LocalFileTokenPayload => {
    const secret = requireJwtSecret()
    const decoded = jwt.verify(token, secret) as any
    if (!decoded || decoded.kind !== 'local-file' || typeof decoded.key !== 'string' || typeof decoded.mimeType !== 'string') {
        throw new Error('Invalid token')
    }
    return decoded as LocalFileTokenPayload
}

