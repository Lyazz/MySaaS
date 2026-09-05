import type { Request, Response } from 'express'
import { whatsappTemplatesService } from './whatsapp-templates.service'
import { WhatsAppOnboardingError, whatsappOnboardingService } from './whatsapp-onboarding.service'
import { whatsappService } from './whatsapp.service'

/**
 * The tenant-facing side of the integration: connecting a WhatsApp Business
 * Account, what the admin screens read, and the seller's "send the confirmation
 * now" button.
 */
export class WhatsAppAdminController {
    async status(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const status = await whatsappService.getAdminStatus(tenant.id)
            res.json({ ...status, signup: whatsappOnboardingService.signupConfig() })
        } catch (error) {
            console.error('WhatsApp status error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    /** Finishes Embedded Signup: code in, connected account out. */
    async connect(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { code, wabaId, phoneNumberId } = req.body ?? {}
            res.json(await whatsappOnboardingService.connect(tenant.id, { code, wabaId, phoneNumberId }))
        } catch (error) {
            this.fail(res, error, 'WhatsApp connect error')
        }
    }

    async disconnect(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            res.json(await whatsappOnboardingService.disconnect(tenant.id))
        } catch (error) {
            this.fail(res, error, 'WhatsApp disconnect error')
        }
    }

    async updateSettings(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { autoSendEnabled, remindersEnabled, isActive } = req.body ?? {}
            res.json(
                await whatsappOnboardingService.updateSettings(tenant.id, {
                    autoSendEnabled,
                    remindersEnabled,
                    isActive
                })
            )
        } catch (error) {
            this.fail(res, error, 'WhatsApp settings error')
        }
    }

    /** Submits whatever Meta has not approved yet; `force` rebuilds both. */
    async ensureTemplates(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const force = req.body?.force === true
            res.json(await whatsappTemplatesService.ensureTemplates(tenant.id, { force }))
        } catch (error) {
            this.fail(res, error, 'WhatsApp template creation error')
        }
    }

    async syncTemplates(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            res.json({ templates: await whatsappTemplatesService.syncStatuses(tenant.id) })
        } catch (error) {
            this.fail(res, error, 'WhatsApp template sync error')
        }
    }

    /**
     * Sends the confirmation through the tenant's own number.
     *
     * A refusal is not an error: the response carries why (no WABA connected, no
     * approved template, a number that is not on WhatsApp) with a 200, because
     * the admin falls back to the manual wa.me link on exactly those answers.
     */
    async sendConfirmation(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const orderId = String(req.params.id || '')
            if (!orderId) {
                return res.status(400).json({ statusCode: 400, message: 'Order ID is required' })
            }

            const result = await whatsappService.sendOrderConfirmation(tenant.id, orderId, { manual: true })
            res.json(result)
        } catch (error) {
            console.error('WhatsApp manual confirmation error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async orderMessages(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const orderId = String(req.params.id || '')
            if (!orderId) {
                return res.status(400).json({ statusCode: 400, message: 'Order ID is required' })
            }

            res.json({ messages: await whatsappService.listOrderMessages(tenant.id, orderId) })
        } catch (error) {
            console.error('WhatsApp order messages error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    /**
     * Meta's refusals are the seller's problem to fix (a number already on
     * another WABA, a template rejected), so its wording is passed through
     * rather than flattened into a 500.
     */
    private fail(res: Response, error: unknown, logLabel: string) {
        if (error instanceof WhatsAppOnboardingError) {
            return res.status(error.statusCode).json({
                statusCode: error.statusCode,
                message: error.statusMessage
            })
        }

        console.error(`${logLabel}:`, error)
        const message = error instanceof Error ? error.message : ''
        if (message === 'WhatsApp integration is not configured') {
            return res.status(404).json({ statusCode: 404, message })
        }

        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
}
