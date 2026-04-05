import type { Request, Response } from 'express'
import { StorageUnavailableError, UploadValidationError } from './upload.errors'
import { UploadService } from './upload.service'

export class UploadController {
    constructor(private uploadService = new UploadService()) {}

    async upload(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            if (!tenant) {
                return res.status(400).json({ error: 'Tenant context missing' })
            }

            const file = req.file
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' })
            }

            const result = await this.uploadService.uploadPublicImage({
                tenantId: tenant.id,
                originalName: file.originalname,
                mimeType: file.mimetype,
                buffer: file.buffer
            })

            return res.json({ url: result.url, storage: result.storage })
        } catch (error) {
            if (error instanceof UploadValidationError) {
                return res.status(400).json({ error: error.message })
            }
            if (error instanceof StorageUnavailableError) {
                return res.status(503).json({ error: error.message })
            }

            console.error('Upload error:', error)
            const message = error instanceof Error ? error.message : 'Upload failed'
            return res.status(500).json({ error: message })
        }
    }
}

