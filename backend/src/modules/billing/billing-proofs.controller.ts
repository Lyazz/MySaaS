import type { Request, Response } from 'express'
import { BillingProofNotFoundError, BillingProofValidationError } from './billing-proofs.errors'
import { BillingProofsService } from './billing-proofs.service'

export class BillingProofsController {
    constructor(private readonly service = new BillingProofsService()) {}

    async upload(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const file = (req as any).file as { buffer: Buffer; mimetype: string } | undefined
        if (!file) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'No file uploaded' })
        }

        try {
            const result = await this.service.uploadPaymentProof({
                tenantId: tenant.id,
                mimeType: file.mimetype,
                buffer: file.buffer
            })
            return res.json(result)
        } catch (error) {
            if (error instanceof BillingProofValidationError) {
                return res.status(400).json({ statusCode: 400, statusMessage: error.message })
            }
            const storageUnavailable =
                (error as any)?.code &&
                ['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND', 'AccessDenied'].includes(
                    (error as any).code
                )
            if (storageUnavailable || (error as any)?.$metadata?.httpStatusCode === 503) {
                return res.status(503).json({ statusCode: 503, statusMessage: 'Storage unavailable' })
            }
            console.error('Billing proof upload error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async getPaymentProofUrl(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const paymentId = String((req.params as any)?.paymentId || '')
        if (!paymentId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing paymentId' })
        }

        try {
            const result = await this.service.getTenantPaymentProofUrl({ tenantId: tenant.id, paymentId })
            return res.json(result)
        } catch (error) {
            if (error instanceof BillingProofNotFoundError) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Proof not found' })
            }
            if (error instanceof BillingProofValidationError) {
                return res.status(400).json({ statusCode: 400, statusMessage: error.message })
            }
            const storageUnavailable =
                (error as any)?.code &&
                ['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND', 'AccessDenied'].includes(
                    (error as any).code
                )
            if (storageUnavailable || (error as any)?.$metadata?.httpStatusCode === 503) {
                return res.status(503).json({ statusCode: 503, statusMessage: 'Storage unavailable' })
            }
            console.error('Billing proof presign error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
