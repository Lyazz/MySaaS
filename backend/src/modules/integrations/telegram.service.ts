import { Telegraf } from 'telegraf'
import prisma from '../../lib/prisma'
import { IntegrationsService } from './integrations.service'

type TelegramApiResponse<T> = {
    ok: boolean
    result?: T
    description?: string
    error_code?: number
}

type TelegramBotInfo = {
    id: number
    is_bot: true
    first_name: string
    username?: string
}

type TelegramChat = {
    id: number
    type: 'private' | 'group' | 'supergroup' | 'channel'
    title?: string
    username?: string
    first_name?: string
    last_name?: string
}

type TelegramUpdate = {
    update_id: number
    message?: { date: number; chat: TelegramChat }
    edited_message?: { date: number; chat: TelegramChat }
    channel_post?: { date: number; chat: TelegramChat }
    edited_channel_post?: { date: number; chat: TelegramChat }
    my_chat_member?: { date: number; chat: TelegramChat }
}

export class TelegramService {
    private integrationsService: IntegrationsService

    constructor() {
        this.integrationsService = new IntegrationsService()
    }

    async detectChats(botToken: string, opts?: { limit?: number }) {
        const trimmed = String(botToken || '').trim()
        if (!trimmed) {
            return { bot: null as any, chats: [] as any[], error: 'Bot token is required' }
        }

        const bot = await this.getMe(trimmed)
        const updates = await this.getUpdates(trimmed, opts?.limit ?? 50)

        const byChatId = new Map<
            string,
            { chatId: string; type: TelegramChat['type']; title?: string; username?: string; name?: string; lastSeenAt: number }
        >()

        for (const update of updates) {
            const payload =
                update.message ??
                update.edited_message ??
                update.channel_post ??
                update.edited_channel_post ??
                update.my_chat_member

            if (!payload?.chat?.id) continue

            const chat = payload.chat
            const chatId = String(chat.id)
            const lastSeenAt = typeof (payload as any).date === 'number' ? (payload as any).date : 0

            const title = typeof chat.title === 'string' ? chat.title : undefined
            const username = typeof chat.username === 'string' ? chat.username : undefined
            const name =
                chat.type === 'private'
                    ? [chat.first_name, chat.last_name].filter(Boolean).join(' ') || (username ? `@${username}` : undefined)
                    : title || (username ? `@${username}` : undefined)

            const existing = byChatId.get(chatId)
            if (!existing || lastSeenAt > existing.lastSeenAt) {
                byChatId.set(chatId, { chatId, type: chat.type, title, username, name, lastSeenAt })
            }
        }

        const chats = [...byChatId.values()]
            .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
            .map(({ lastSeenAt, ...c }) => c)

        return { bot: { id: String(bot.id), username: bot.username ?? null, name: bot.first_name }, chats }
    }

    async sendOrderNotification(tenantId: string, order: any, isWhatsAppConfirmation: boolean = false) {
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
            // Fetch tenant to build a public admin link for this order notification.
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    slug: true,
                    domains: {
                        take: 1,
                        orderBy: { createdAt: 'asc' },
                        select: { domain: true }
                    }
                }
            })

            if (!tenant) return

            const bot = new Telegraf(botToken)
            const adminUrl = this.buildOrderAdminUrl({
                slug: tenant.slug,
                customDomain: tenant.domains[0]?.domain ?? null,
                orderId: order.id
            })
            const message = this.formatOrderMessage(order, adminUrl, isWhatsAppConfirmation)
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

    private formatOrderMessage(order: any, adminUrl: string, isWhatsAppConfirmation: boolean = false): string {
        const orderReference = typeof order.publicId === 'string' && order.publicId.trim().length > 0
            ? order.publicId.trim()
            : order.id.slice(0, 8)

        if (isWhatsAppConfirmation) {
            return `✅ *Commande #${orderReference} confirmée via WhatsApp*\n🔗 [Voir la commande](${adminUrl})`
        }

        const lines = [
            `📦 *Nouvelle Commande Reçue !*`,
            `Commande #${orderReference}`,
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

    private buildOrderAdminUrl(input: { slug: string; customDomain: string | null; orderId: string }): string {
        const customDomain = typeof input.customDomain === 'string' ? input.customDomain.trim() : ''
        if (customDomain) {
            return `https://${customDomain}/admin/orders/${input.orderId}`
        }

        const platformDomain = (process.env.PLATFORM_BASE_DOMAIN ?? process.env.PLATFORM_DOMAIN ?? '').trim()
        if (platformDomain) {
            return `https://${input.slug}.${platformDomain}/admin/orders/${input.orderId}`
        }

        // Dev fallback when no public domain is configured.
        return `http://${input.slug}.localhost:3000/admin/orders/${input.orderId}`
    }

    private formatVariant(variant: any): string {
        // Fallback if we don't have option names easily available here without fetching
        // In a real app we might fetch or store snapshot of options
        return variant.sku || 'Variante'
    }

    private async getMe(botToken: string): Promise<TelegramBotInfo> {
        const data = await this.telegramGet<TelegramBotInfo>(botToken, 'getMe')
        return data
    }

    private async getUpdates(botToken: string, limit: number): Promise<TelegramUpdate[]> {
        const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 50
        const result = await this.telegramGet<TelegramUpdate[]>(botToken, 'getUpdates', {
            limit: String(safeLimit),
            timeout: '0'
        })
        return Array.isArray(result) ? result : []
    }

    private async telegramGet<T>(botToken: string, method: string, params?: Record<string, string>): Promise<T> {
        const url = new URL(`https://api.telegram.org/bot${botToken}/${method}`)
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.set(key, value)
            }
        }

        let res: Response
        try {
            res = await fetch(url, { method: 'GET' })
        } catch {
            throw new Error('Failed to reach Telegram API. Check your internet connection and try again.')
        }

        let json: TelegramApiResponse<T>
        try {
            json = (await res.json()) as TelegramApiResponse<T>
        } catch {
            throw new Error('Telegram API returned an invalid response.')
        }

        if (!json?.ok) {
            const code = typeof json?.error_code === 'number' ? ` (code ${json.error_code})` : ''
            const desc = typeof json?.description === 'string' && json.description ? json.description : 'Telegram API error'
            throw new Error(`${desc}${code}`)
        }

        return json.result as T
    }
}
