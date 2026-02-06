import type { Request, Response } from 'express'
import { IntegrationsService } from './integrations.service'
import { TelegramService } from './telegram.service'

const integrationsService = new IntegrationsService()
const telegramService = new TelegramService()

export class IntegrationsController {
    async getIntegration(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { provider } = req.params

            const integration = await integrationsService.getIntegration(tenant.id, String(provider || '').toUpperCase())
            res.json(integration || { isActive: false, config: {} })
        } catch (error: any) {
            console.error('GET Integration Error:', error)
            res.status(500).json({ error: 'Failed to fetch integration', details: error.message })
        }
    }

    async saveIntegration(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { provider } = req.params
            const { config, isActive } = req.body

            const normalizedProvider = String(provider || '').toUpperCase()
            let normalizedConfig = config

            if (normalizedProvider === 'FACEBOOK') {
                const pixelIdRaw = (config as any)?.pixelId
                const pixelId = typeof pixelIdRaw === 'string' ? pixelIdRaw.trim() : ''

                if (pixelId && !/^[0-9]+$/.test(pixelId)) {
                    return res.status(400).json({ statusCode: 400, statusMessage: 'Facebook pixelId must be numeric' })
                }

                if (Boolean(isActive) && !pixelId) {
                    return res.status(400).json({ statusCode: 400, statusMessage: 'Facebook pixelId is required when enabled' })
                }

                normalizedConfig = pixelId ? { pixelId } : {}
            }

            const integration = await integrationsService.upsertIntegration(
                tenant.id,
                normalizedProvider,
                normalizedConfig,
                Boolean(isActive)
            )
            res.json(integration)
        } catch (error: any) {
            console.error('POST Integration Error:', error)
            res.status(500).json({ error: 'Failed to save integration', details: error.message })
        }
    }

    async testIntegration(req: Request, res: Response) {
        try {
            const { provider } = req.params
            const { config } = req.body

            if (String(provider || '').toUpperCase() === 'TELEGRAM') {
                const result = await telegramService.testConnection(config?.botToken, config?.chatId)
                if (result.success) {
                    res.json({ success: true })
                } else {
                    res.status(400).json({ error: result.error })
                }
                return
            }

            res.status(400).json({ error: 'Test not supported for this provider' })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to test connection' })
        }
    }
}
