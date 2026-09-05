import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import { optimizeImage } from '../../lib/image-optimizer'
import { ensureBucketExists, PRIVATE_BUCKET_NAME, s3Client } from '../../lib/s3'
import { parseStorageRef } from '../../lib/storage-ref'
import { presignGetObject } from '../../lib/s3-presign'
import { signLocalFileToken } from '../../lib/local-file-token'
import { AiDocumentValidationError } from './ai-documents.errors'

/**
 * Storage for scanned documents. Deliberately the same shape as
 * `BillingProofsService` — private bucket, tenant-scoped key, presigned reads,
 * local-disk fallback in dev — because the trust model is identical: files the
 * merchant uploaded that nobody else may read.
 */

export const ALLOWED_DOCUMENT_MIMES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf'
] as const

export type AllowedDocumentMime = (typeof ALLOWED_DOCUMENT_MIMES)[number]

const MIME_TO_EXT: Record<AllowedDocumentMime, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
}

export const isAllowedDocumentMime = (value: string): value is AllowedDocumentMime =>
    (ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(value)

const isStorageUnavailableError = (error: unknown) => {
    const code = (error as any)?.code
    const retryableCodes = ['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND', 'AccessDenied']
    return Boolean(code && retryableCodes.includes(code)) || (error as any)?.$metadata?.httpStatusCode === 503
}

const allowLocalFallback = () =>
    process.env.S3_FALLBACK_LOCAL === 'true' ||
    (process.env.S3_FALLBACK_LOCAL !== 'false' && process.env.NODE_ENV !== 'production')

const localPathFor = (key: string) => path.resolve(process.cwd(), 'private_uploads', key)

const ensureTenantScopedKey = (tenantId: string, key: string) => {
    if (!key.startsWith(`tenants/${tenantId}/`)) {
        throw new AiDocumentValidationError(403, 'Document does not belong to this store')
    }
}

const streamToBuffer = async (body: any): Promise<Buffer> => {
    if (!body) throw new Error('Empty object body')
    if (typeof body.transformToByteArray === 'function') {
        return Buffer.from(await body.transformToByteArray())
    }
    const chunks: Buffer[] = []
    for await (const chunk of body as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks)
}

export class AiDocumentStorageService {
    private buildKey(tenantId: string, ext: string) {
        const nonce = crypto.randomBytes(10).toString('hex')
        return `tenants/${tenantId}/ai-documents/${Date.now()}-${nonce}${ext}`
    }

    /**
     * Stores the upload and returns the ref plus the exact bytes that will be
     * sent to the model, so the caller never re-optimizes and the model always
     * sees what the merchant will see in the review pane.
     */
    async store(args: { tenantId: string; mimeType: string; buffer: Buffer }): Promise<{
        documentRef: string
        mimeType: AllowedDocumentMime
        buffer: Buffer
    }> {
        if (!isAllowedDocumentMime(args.mimeType)) {
            throw new AiDocumentValidationError(400, 'Only PNG, JPEG, WebP and PDF documents are supported')
        }
        const mimeType = args.mimeType

        const body =
            mimeType === 'application/pdf'
                ? args.buffer
                : (
                      await optimizeImage({
                          buffer: args.buffer,
                          mimeType,
                          maxDimensionPx: 2400,
                          profile: 'document'
                      })
                  ).buffer

        const key = this.buildKey(args.tenantId, MIME_TO_EXT[mimeType])

        try {
            await ensureBucketExists(PRIVATE_BUCKET_NAME)
            await s3Client.send(
                new PutObjectCommand({
                    Bucket: PRIVATE_BUCKET_NAME,
                    Key: key,
                    Body: body,
                    ContentType: mimeType
                })
            )
            return { documentRef: `s3://${PRIVATE_BUCKET_NAME}/${key}`, mimeType, buffer: body }
        } catch (error) {
            if (!allowLocalFallback() || !isStorageUnavailableError(error)) throw error

            const absPath = localPathFor(key)
            await fs.mkdir(path.dirname(absPath), { recursive: true })
            await fs.writeFile(absPath, body)
            return { documentRef: `local://${key}`, mimeType, buffer: body }
        }
    }

    /** Short-lived URL the review screen uses to show the original alongside the table. */
    async getReadUrl(args: { tenantId: string; documentRef: string; mimeType: string }) {
        const ref = parseStorageRef(args.documentRef)
        if (ref.kind === 'http') return { url: ref.url }

        if (ref.kind === 'local') {
            ensureTenantScopedKey(args.tenantId, ref.key)
            const token = signLocalFileToken({ key: ref.key, mimeType: args.mimeType })
            return { url: `/api/files/local?token=${encodeURIComponent(token)}` }
        }

        if (ref.bucket !== PRIVATE_BUCKET_NAME) {
            throw new AiDocumentValidationError(400, 'Invalid document bucket')
        }
        ensureTenantScopedKey(args.tenantId, ref.key)
        return { url: await presignGetObject({ bucket: ref.bucket, key: ref.key }) }
    }

    /** Reads the stored bytes back, for a re-run of extraction on an existing job. */
    async read(args: { tenantId: string; documentRef: string }): Promise<Buffer> {
        const ref = parseStorageRef(args.documentRef)
        if (ref.kind === 'http') throw new AiDocumentValidationError(400, 'Unsupported document ref')

        if (ref.kind === 'local') {
            ensureTenantScopedKey(args.tenantId, ref.key)
            return fs.readFile(localPathFor(ref.key))
        }

        if (ref.bucket !== PRIVATE_BUCKET_NAME) {
            throw new AiDocumentValidationError(400, 'Invalid document bucket')
        }
        ensureTenantScopedKey(args.tenantId, ref.key)
        const result = await s3Client.send(new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key }))
        return streamToBuffer(result.Body)
    }
}
