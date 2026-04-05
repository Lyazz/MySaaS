import { PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import {
    buildPublicUrl,
    ensureBucketExists,
    ensureBucketPublicRead,
    PUBLIC_BUCKET_NAME,
    s3Client
} from '../../lib/s3'
import { StorageUnavailableError, UploadValidationError } from './upload.errors'

const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const

const MIME_TO_EXT: Record<(typeof ALLOWED_MIMES)[number], string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp'
}

export type UploadResult = {
    url: string
    storage: 's3' | 'local'
    key?: string
}

const isStorageUnavailableError = (error: unknown) => {
    const code = (error as any)?.code
    const retryableCodes = [
        'ECONNREFUSED',
        'ECONNRESET',
        'ENETUNREACH',
        'EAI_AGAIN',
        'ENOTFOUND',
        'AccessDenied'
    ]
    return Boolean(code && retryableCodes.includes(code)) || (error as any)?.$metadata?.httpStatusCode === 503
}

export class UploadService {
    private buildTenantKey(args: {
        tenantId: string
        mimeType: (typeof ALLOWED_MIMES)[number]
        originalName: string
    }) {
        const safeOriginal = args.originalName.replace(/[^a-zA-Z0-9_.-]/g, '_')
        const ext = MIME_TO_EXT[args.mimeType]
        const baseName = safeOriginal.replace(/\.[^.]+$/, '').slice(0, 80) || 'image'
        const nonce = crypto.randomBytes(6).toString('hex')

        return `tenants/${args.tenantId}/public/${Date.now()}-${nonce}-${baseName}${ext}`
    }

    private async uploadToLocal(args: { tenantId: string; key: string; buffer: Buffer }): Promise<UploadResult> {
        const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', args.tenantId)
        await fs.mkdir(uploadDir, { recursive: true })
        const fileBaseName = path.basename(args.key)
        const destPath = path.join(uploadDir, fileBaseName)
        await fs.writeFile(destPath, args.buffer)
        const publicUrl = `/uploads/${args.tenantId}/${fileBaseName}`

        return { url: publicUrl, storage: 'local' }
    }

    async uploadPublicImage(args: {
        tenantId: string
        originalName: string
        mimeType: string
        buffer: Buffer
    }): Promise<UploadResult> {
        const mimeType = args.mimeType as (typeof ALLOWED_MIMES)[number]
        if (!ALLOWED_MIMES.includes(mimeType)) {
            throw new UploadValidationError('Only PNG, JPEG, and WebP uploads are allowed')
        }

        const key = this.buildTenantKey({
            tenantId: args.tenantId,
            mimeType,
            originalName: args.originalName
        })

        try {
            await ensureBucketExists(PUBLIC_BUCKET_NAME)
            await ensureBucketPublicRead(PUBLIC_BUCKET_NAME)

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: PUBLIC_BUCKET_NAME,
                    Key: key,
                    Body: args.buffer,
                    ContentType: mimeType
                })
            )

            return {
                url: buildPublicUrl(PUBLIC_BUCKET_NAME, key),
                storage: 's3',
                key
            }
        } catch (cloudError) {
            const allowFallback = process.env.S3_FALLBACK_LOCAL !== 'false' && process.env.NODE_ENV !== 'production'
            if (allowFallback && isStorageUnavailableError(cloudError)) {
                return this.uploadToLocal({ tenantId: args.tenantId, key, buffer: args.buffer })
            }

            if (isStorageUnavailableError(cloudError)) {
                throw new StorageUnavailableError(
                    'Storage unavailable. Please ensure S3 is reachable via S3_ENDPOINT and credentials.'
                )
            }

            throw cloudError
        }
    }
}

