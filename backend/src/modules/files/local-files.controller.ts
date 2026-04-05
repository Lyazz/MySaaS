import type { Request, Response } from 'express'
import { verifyLocalFileToken } from '../../lib/local-file-token'
import { LocalFilesService } from './local-files.service'

export class LocalFilesController {
    constructor(private readonly service = new LocalFilesService()) {}

    async download(req: Request, res: Response) {
        const token = typeof req.query.token === 'string' ? req.query.token : ''
        if (!token) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing token' })
        }

        try {
            const payload = verifyLocalFileToken(token)
            const absPath = this.service.resolveAbsolutePath(payload.key)
            const ok = await this.service.exists(absPath)
            if (!ok) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'File not found' })
            }

            res.setHeader('Content-Type', payload.mimeType)
            res.setHeader('Cache-Control', 'no-store')
            this.service.stream(absPath).pipe(res)
        } catch {
            return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid token' })
        }
    }
}

