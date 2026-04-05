import { PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import { optimizeImage } from '../../lib/image-optimizer'
import prisma from '../../lib/prisma'
import { ensureBucketExists, PRIVATE_BUCKET_NAME, s3Client } from '../../lib/s3'
import { parseStorageRef } from '../../lib/storage-ref'
import { presignGetObject } from '../../lib/s3-presign'
import { signLocalFileToken } from '../../lib/local-file-token'
import { BillingProofNotFoundError, BillingProofValidationError } from './billing-proofs.errors'

const ALLOWED_PROOF_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const

const MIME_TO_EXT: Record<(typeof ALLOWED_PROOF_MIMES)[number], string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
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

const mimeTypeFromKey = (key: string) => {
    const ext = path.extname(key).toLowerCase()
    if (ext === '.png') return 'image/png'
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
    if (ext === '.webp') return 'image/webp'
    if (ext === '.pdf') return 'application/pdf'
    return 'application/octet-stream'
}

const ensureTenantScopedKey = (tenantId: string, key: string) => {
    if (!key.startsWith(`tenants/${tenantId}/`)) {
        throw new BillingProofValidationError('Invalid proof key for tenant')
    }
}

export class BillingProofsService {
    private buildProofKey(args: { tenantId: string; ext: string }) {
        const nonce = crypto.randomBytes(10).toString('hex')
        return `tenants/${args.tenantId}/billing-proofs/${Date.now()}-${nonce}${args.ext}`
    }

    async uploadPaymentProof(args: { tenantId: string; mimeType: string; buffer: Buffer }) {
        const mimeType = args.mimeType as (typeof ALLOWED_PROOF_MIMES)[number]
        if (!ALLOWED_PROOF_MIMES.includes(mimeType)) {
            throw new BillingProofValidationError('Only PNG, JPEG, WebP, and PDF uploads are allowed')
        }

        const ext = MIME_TO_EXT[mimeType]
        const key = this.buildProofKey({ tenantId: args.tenantId, ext })

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

            return { url: `s3://${PRIVATE_BUCKET_NAME}/${key}` }
        } catch (error) {
            const allowFallback =
                process.env.S3_FALLBACK_LOCAL === 'true' ||
                (process.env.S3_FALLBACK_LOCAL !== 'false' && process.env.NODE_ENV !== 'production')
            if (!allowFallback || !isStorageUnavailableError(error)) throw error

            const absPath = path.resolve(process.cwd(), 'private_uploads', key)
            await fs.mkdir(path.dirname(absPath), { recursive: true })
            await fs.writeFile(absPath, body)
            return { url: `local://${key}` }
        }
    }

    async getTenantPaymentProofUrl(args: { tenantId: string; paymentId: string }) {
        const payment = await prisma.billingPayment.findUnique({
            where: { id: args.paymentId, tenantId: args.tenantId },
            select: { proofUrl: true }
        })

        if (!payment?.proofUrl) throw new BillingProofNotFoundError('Proof not found')

        const ref = parseStorageRef(payment.proofUrl)
        if (ref.kind === 'http') return { url: ref.url }

        if (ref.kind === 'local') {
            ensureTenantScopedKey(args.tenantId, ref.key)
            const token = signLocalFileToken({ key: ref.key, mimeType: mimeTypeFromKey(ref.key) })
            return { url: `/api/files/local?token=${encodeURIComponent(token)}` }
        }

        if (ref.bucket !== PRIVATE_BUCKET_NAME) {
            throw new BillingProofValidationError('Invalid proof bucket')
        }

        ensureTenantScopedKey(args.tenantId, ref.key)
        const url = await presignGetObject({ bucket: ref.bucket, key: ref.key })
        return { url }
    }
}
