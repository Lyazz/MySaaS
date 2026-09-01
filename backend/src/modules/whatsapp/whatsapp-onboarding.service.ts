import { IntegrationsService } from '../integrations/integrations.service'
import { WhatsAppApiError, WhatsAppCloudClient, exchangeSignupCode } from './whatsapp-cloud.client'
import { whatsappTemplatesService } from './whatsapp-templates.service'
import { WHATSAPP_PROVIDER, parseWhatsAppConfig, type WhatsAppConfig } from './whatsapp.types'

/**
 * Connecting a tenant's WhatsApp Business Account.
 *
 * The seller never opens Meta Business Manager: Embedded Signup hands the
 * browser a one-time code, this exchanges it for the business token, subscribes
 * the Swekly app to that WABA — without which their numbers send fine but no
 * button click ever reaches us — and submits the templates.
 */

export class WhatsAppOnboardingError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.name = 'WhatsAppOnboardingError'
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

const env = (name: string) => (process.env[name] ?? '').trim()

export class WhatsAppOnboardingService {
    private integrations = new IntegrationsService()

    /**
     * What the browser needs to open the Embedded Signup dialog. Both values are
     * public — they travel in the client-side FB.login call either way.
     */
    signupConfig() {
        const appId = env('META_APP_ID')
        const configId = env('META_WA_CONFIG_ID')
        const graphVersion = env('META_GRAPH_VERSION') || 'v21.0'

        return {
            appId: appId || null,
            configId: configId || null,
            graphVersion,
            available: Boolean(appId && configId && env('META_APP_SECRET'))
        }
    }

    async connect(
        tenantId: string,
        input: { code: unknown; wabaId: unknown; phoneNumberId: unknown }
    ) {
        const appId = env('META_APP_ID')
        const appSecret = env('META_APP_SECRET')
        if (!appId || !appSecret) {
            throw new WhatsAppOnboardingError(503, 'WhatsApp sign-up is not configured on this platform')
        }

        const code = typeof input.code === 'string' ? input.code.trim() : ''
        const wabaId = typeof input.wabaId === 'string' ? input.wabaId.trim() : ''
        const phoneNumberId = typeof input.phoneNumberId === 'string' ? input.phoneNumberId.trim() : ''

        if (!code || !wabaId || !phoneNumberId) {
            throw new WhatsAppOnboardingError(400, 'code, wabaId and phoneNumberId are required')
        }

        let accessToken: string
        try {
            accessToken = await exchangeSignupCode({ appId, appSecret, code })
        } catch (error) {
            throw this.toOnboardingError(error, 'The WhatsApp sign-up could not be completed')
        }

        const client = new WhatsAppCloudClient(accessToken)

        try {
            // Without this the WABA sends but never delivers a webhook to us.
            await client.subscribeApp(wabaId)
        } catch (error) {
            throw this.toOnboardingError(error, 'Swekly could not subscribe to this WhatsApp account')
        }

        let displayPhoneNumber: string | null = null
        let verifiedName: string | null = null
        try {
            const phone = await client.getPhoneNumber(phoneNumberId)
            displayPhoneNumber = phone.display_phone_number ?? null
            verifiedName = phone.verified_name ?? null
        } catch (error) {
            // A number we cannot read details for is still a number we can send
            // from; the admin just shows less about it.
            console.warn('[WhatsAppOnboarding] Could not read phone number details:', error)
        }

        const existing = parseWhatsAppConfig(
            (await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER))?.config
        )

        const config: WhatsAppConfig = {
            wabaId,
            phoneNumberId,
            displayPhoneNumber,
            verifiedName,
            accessToken,
            // Reconnecting the same number keeps the seller's toggles; a new one
            // starts with both on, which is what connecting a WABA asks for.
            autoSendEnabled: existing?.phoneNumberId === phoneNumberId ? existing.autoSendEnabled : true,
            remindersEnabled: existing?.phoneNumberId === phoneNumberId ? existing.remindersEnabled : true,
            templates: existing?.phoneNumberId === phoneNumberId ? existing.templates : {},
            confirmOrigin: existing?.phoneNumberId === phoneNumberId ? existing.confirmOrigin : null
        }

        await this.integrations.upsertIntegration(tenantId, WHATSAPP_PROVIDER, config, true)

        // Templates are reviewed by Meta asynchronously: a failure here leaves a
        // connected account whose templates the seller can submit again.
        try {
            const templates = await whatsappTemplatesService.ensureTemplates(tenantId)
            return { connected: true, displayPhoneNumber, verifiedName, templates }
        } catch (error) {
            console.error('[WhatsAppOnboarding] Template creation failed:', error)
            return {
                connected: true,
                displayPhoneNumber,
                verifiedName,
                templates: {},
                templateError: error instanceof Error ? error.message : 'Template creation failed'
            }
        }
    }

    /** Turns sending off without losing the connection. */
    async updateSettings(
        tenantId: string,
        input: { autoSendEnabled?: unknown; remindersEnabled?: unknown; isActive?: unknown }
    ) {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        const config = parseWhatsAppConfig(integration?.config)
        if (!integration || !config) {
            throw new WhatsAppOnboardingError(404, 'No WhatsApp account is connected')
        }

        const next: WhatsAppConfig = {
            ...config,
            autoSendEnabled:
                typeof input.autoSendEnabled === 'boolean' ? input.autoSendEnabled : config.autoSendEnabled,
            remindersEnabled:
                typeof input.remindersEnabled === 'boolean' ? input.remindersEnabled : config.remindersEnabled
        }
        const isActive = typeof input.isActive === 'boolean' ? input.isActive : integration.isActive

        await this.integrations.upsertIntegration(tenantId, WHATSAPP_PROVIDER, next, isActive)
        return { isActive, autoSendEnabled: next.autoSendEnabled, remindersEnabled: next.remindersEnabled }
    }

    /**
     * Disconnects by dropping the stored credentials.
     *
     * The message log stays: it belongs to the orders, not to the connection.
     */
    async disconnect(tenantId: string) {
        await this.integrations.upsertIntegration(tenantId, WHATSAPP_PROVIDER, {}, false)
        return { connected: false }
    }

    private toOnboardingError(error: unknown, fallback: string) {
        if (error instanceof WhatsAppApiError) {
            // Meta's own wording is more useful to the seller than ours.
            return new WhatsAppOnboardingError(error.httpStatus >= 500 ? 502 : 400, error.message)
        }
        return new WhatsAppOnboardingError(502, fallback)
    }
}

export const whatsappOnboardingService = new WhatsAppOnboardingService()
