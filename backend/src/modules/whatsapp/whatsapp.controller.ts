import { createHmac, timingSafeEqual } from 'crypto'
import type { Request, Response } from 'express'
import { whatsappInboundService } from './whatsapp-inbound.service'

/**
 * The public WhatsApp webhook.
 *
 * HTTP layer only: prove the request really came from Meta, answer, and hand the
 * payload to the inbound service. Both checks fail closed — a missing
 * `META_APP_SECRET` rejects rather than accepts, because an open webhook here
 * would let anyone confirm or cancel orders.
 */
export class WhatsAppWebhookController {
    /** Meta's subscription handshake (GET with hub.* query parameters). */
    verify(req: Request, res: Response) {
        const expected = (process.env.META_WA_VERIFY_TOKEN ?? '').trim()
        if (!expected) {
            console.error('[WhatsAppWebhook] META_WA_VERIFY_TOKEN is not set')
            return res.status(503).json({ statusCode: 503, statusMessage: 'Webhook not configured' })
        }

        const mode = typeof req.query['hub.mode'] === 'string' ? req.query['hub.mode'] : ''
        const token = typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : ''
        const challenge = typeof req.query['hub.challenge'] === 'string' ? req.query['hub.challenge'] : ''

        if (mode !== 'subscribe' || !this.safeEqual(token, expected)) {
            return res.status(403).json({ statusCode: 403, statusMessage: 'Forbidden' })
        }

        return res.status(200).type('text/plain').send(challenge)
    }

    async receive(req: Request, res: Response) {
        const secret = (process.env.META_APP_SECRET ?? '').trim()
        const signature = req.get('x-hub-signature-256') || ''

        if (!secret) {
            console.error('[WhatsAppWebhook] META_APP_SECRET is not set')
            return res.status(503).json({ statusCode: 503, statusMessage: 'Webhook not configured' })
        }

        if (!signature || !req.rawBody || !this.verifySignature({ rawBody: req.rawBody, signature, secret })) {
            return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid signature' })
        }

        // Acknowledge before doing the work. Meta retries anything it does not
        // see a 200 for within seconds, and cancelling a parcel at a carrier can
        // take longer than that — the retry would arrive mid-cancellation.
        res.status(200).json({ received: true })

        try {
            const outcome = await whatsappInboundService.handleWebhook(req.body)
            if (outcome.actions.length > 0) {
                console.log(`[WhatsAppWebhook] ${outcome.actions.join(', ')}`)
            }
        } catch (error) {
            console.error('[WhatsAppWebhook] Failed to process payload:', error)
        }
    }

    private verifySignature(input: { rawBody: Buffer; signature: string; secret: string }) {
        const incoming = input.signature.trim().toLowerCase().startsWith('sha256=')
            ? input.signature.trim().slice('sha256='.length).trim()
            : input.signature.trim()
        const expected = createHmac('sha256', input.secret).update(input.rawBody).digest('hex')
        return this.safeEqual(incoming, expected)
    }

    private safeEqual(a: string, b: string) {
        const left = Buffer.from(a)
        const right = Buffer.from(b)
        return left.length === right.length && timingSafeEqual(left, right)
    }
}
