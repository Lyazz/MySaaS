import { Telegraf } from 'telegraf'
import prisma from '../../lib/prisma'
import { IntegrationsService } from './integrations.service'

export class TelegramService {
    private integrationsService: IntegrationsService

    constructor() {
        this.integrationsService = new IntegrationsService()
    }

    async sendOrderNotification(tenantId: string, order: any) {
        const integration = await this.integrationsService.getIntegration(tenantId, 'TELEGRAM')

        if (!integration || !integration.isActive || !integration.config) {
            return
        }

        const { botToken, chatId } = integration.config as any

        if (!botToken || !chatId) {
            console.warn(`[TelegramService] Missing config for tenant ${tenantId}`)
            return
        }

        try {
            // Fetch tenant to get the slug for the link
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { slug: true }
            })

            if (!tenant) return

            const bot = new Telegraf(botToken)
            const message = this.formatOrderMessage(order, tenant.slug)
            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' })
        } catch (error) {
            console.error(`[TelegramService] Failed to send notification for tenant ${tenantId}:`, error)
        }
    }

    async testConnection(botToken: string, chatId: string) {
        try {
            const bot = new Telegraf(botToken)
            await bot.telegram.sendMessage(chatId, "✅ Notification de test ! Connexion réussie.")
            return { success: true }
        } catch (error: any) {
            console.error('[TelegramService] Test connection failed:', error)
            return { success: false, error: error.message }
        }
    }

    private formatOrderMessage(order: any, slug: string): string {
        const adminUrl = `http://${slug}.localhost:3000/admin/orders/${order.id}`

        const lines = [
            `📦 *Nouvelle Commande Reçue !*`,
            `Commande #${order.id.slice(0, 8)}`,
            ``,
            `👤 *Client :* ${order.customerName} (${order.customerPhone})`,
            `💰 *Total :* ${order.totalAmount} DZD`,
            `🚚 *Livraison :* ${order.deliveryMode} ${order.shippingWilayaCode ? `(${order.shippingWilayaCode})` : ''}`,
            ``,
            `*Articles :*`,
            ...order.items.map((item: any) =>
                `- ${item.quantity}x ${item.product.title} ${item.variant && item.variant.id ? `(${this.formatVariant(item.variant)})` : ''}`
            ),
            ``,
            `🔗 [Voir la commande](${adminUrl})`
        ]

        return lines.join('\n')
    }

    private formatVariant(variant: any): string {
        // Fallback if we don't have option names easily available here without fetching
        // In a real app we might fetch or store snapshot of options
        return variant.sku || 'Variante'
    }
}
