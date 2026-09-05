import prisma from '../../lib/prisma'
import { buildTenantOrigin } from '../../lib/tenant-host'
import { IntegrationsService } from '../integrations/integrations.service'
import { WhatsAppApiError, WhatsAppCloudClient } from './whatsapp-cloud.client'
import { TEMPLATE_LANGUAGES, TEMPLATE_NAMES, buildTemplateDefinition } from './whatsapp-templates'
import {
    WHATSAPP_PROVIDER,
    isWhatsAppLanguage,
    parseWhatsAppConfig,
    type WhatsAppConfig,
    type WhatsAppLanguage,
    type WhatsAppTemplateKind,
    type WhatsAppTemplateState
} from './whatsapp.types'

const TEMPLATE_KINDS: WhatsAppTemplateKind[] = ['CONFIRMATION', 'REMINDER']

/** Meta's "a template with this name and language already exists". */
const TEMPLATE_EXISTS_SUBCODES = new Set(['2388023', '2388024'])

export type EnsureTemplatesResult = {
    origin: string
    /** True when the templates were pointing at a different origin and were rebuilt. */
    recreated: boolean
    templates: Partial<Record<WhatsAppTemplateKind, WhatsAppTemplateState>>
    errors: Array<{ kind: WhatsAppTemplateKind; language: WhatsAppLanguage; message: string }>
}

/**
 * Creates and tracks the two order templates on a tenant's WABA.
 *
 * The seller never opens Meta Business Manager: connecting the WABA hands us a
 * token with `whatsapp_business_management`, and Swekly submits the templates
 * itself. Meta reviews them asynchronously, so what we store per language is a
 * status — nothing is sendable until Meta says APPROVED.
 */
export class WhatsAppTemplatesService {
    private integrations = new IntegrationsService()

    /** The public origin the tenant's confirmation links must point at. */
    async resolveConfirmOrigin(tenantId: string): Promise<string> {
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

        if (!tenant) throw new Error('Tenant not found')

        return buildTenantOrigin({ slug: tenant.slug, customDomain: tenant.domains[0]?.domain ?? null })
    }

    /**
     * Submits whatever is missing and returns the current per-language status.
     *
     * A template whose URL button points at an origin the store no longer uses
     * would send shoppers to a dead link, so a changed origin rebuilds both
     * templates from scratch — Meta has no way to edit an approved button URL.
     */
    async ensureTemplates(tenantId: string, opts?: { force?: boolean }): Promise<EnsureTemplatesResult> {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        const config = parseWhatsAppConfig(integration?.config)
        if (!integration || !config) {
            throw new Error('WhatsApp integration is not configured')
        }

        const origin = await this.resolveConfirmOrigin(tenantId)
        const originChanged = Boolean(config.confirmOrigin) && config.confirmOrigin !== origin
        const recreate = Boolean(opts?.force) || originChanged

        const client = new WhatsAppCloudClient(config.accessToken)
        const templates: EnsureTemplatesResult['templates'] = recreate ? {} : { ...(config.templates ?? {}) }
        const errors: EnsureTemplatesResult['errors'] = []

        for (const kind of TEMPLATE_KINDS) {
            const name = TEMPLATE_NAMES[kind]

            if (recreate) {
                try {
                    await client.deleteTemplate(config.wabaId, name)
                } catch (error) {
                    // A template that was never created cannot be deleted, and that
                    // is the normal path on a first connection.
                    if (!(error instanceof WhatsAppApiError) || error.retryable) throw error
                }
            }

            const state: WhatsAppTemplateState = templates[kind] ?? { name, languages: {} }
            state.name = name

            for (const language of TEMPLATE_LANGUAGES) {
                if (state.languages[language]?.status === 'APPROVED') continue

                try {
                    const created = await client.createTemplate(
                        config.wabaId,
                        buildTemplateDefinition(kind, language, origin)
                    )
                    state.languages[language] = {
                        status: String(created.status || 'PENDING').toUpperCase(),
                        metaId: created.id ?? null,
                        reason: null,
                        syncedAt: new Date().toISOString()
                    }
                } catch (error) {
                    if (error instanceof WhatsAppApiError && TEMPLATE_EXISTS_SUBCODES.has(String(error.subcode))) {
                        // Already on the WABA from an earlier attempt; the status
                        // sync below fills in where Meta's review got to.
                        state.languages[language] = state.languages[language] ?? {
                            status: 'PENDING',
                            reason: null,
                            syncedAt: new Date().toISOString()
                        }
                        continue
                    }

                    errors.push({
                        kind,
                        language,
                        message: error instanceof Error ? error.message : 'Template creation failed'
                    })
                }
            }

            templates[kind] = state
        }

        await this.persist(tenantId, integration.isActive, config, { templates, confirmOrigin: origin })

        // Ask Meta what it actually thinks of them, so the admin sees a real
        // status rather than the optimistic one the create call returned.
        const synced = await this.syncStatuses(tenantId).catch(() => null)

        return {
            origin,
            recreated: recreate,
            templates: synced ?? templates,
            errors
        }
    }

    /** Refreshes each template's review status from Meta into the stored config. */
    async syncStatuses(tenantId: string): Promise<Partial<Record<WhatsAppTemplateKind, WhatsAppTemplateState>>> {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        const config = parseWhatsAppConfig(integration?.config)
        if (!integration || !config) {
            throw new Error('WhatsApp integration is not configured')
        }

        const client = new WhatsAppCloudClient(config.accessToken)
        const remote = await client.listTemplates(config.wabaId)
        const templates: Partial<Record<WhatsAppTemplateKind, WhatsAppTemplateState>> = {}

        for (const kind of TEMPLATE_KINDS) {
            const name = TEMPLATE_NAMES[kind]
            const state: WhatsAppTemplateState = { name, languages: {} }

            for (const entry of remote) {
                if (entry.name !== name || !isWhatsAppLanguage(entry.language)) continue
                state.languages[entry.language] = {
                    status: String(entry.status || '').toUpperCase() || 'PENDING',
                    reason: entry.rejected_reason ?? null,
                    metaId: entry.id ?? null,
                    syncedAt: new Date().toISOString()
                }
            }

            templates[kind] = state
        }

        await this.persist(tenantId, integration.isActive, config, { templates })
        return templates
    }

    /**
     * The template to send in, or null when Meta has approved none.
     *
     * The store's own language comes first; the others are a fallback so a
     * pending Arabic review does not silently stop every message.
     */
    resolveTemplate(
        config: WhatsAppConfig,
        kind: WhatsAppTemplateKind,
        preferredLanguage: WhatsAppLanguage
    ): { name: string; language: WhatsAppLanguage } | null {
        const state = config.templates?.[kind]
        if (!state) return null

        const candidates: WhatsAppLanguage[] = [
            preferredLanguage,
            ...TEMPLATE_LANGUAGES.filter((language) => language !== preferredLanguage)
        ]

        for (const language of candidates) {
            if (state.languages[language]?.status === 'APPROVED') {
                return { name: state.name, language }
            }
        }

        return null
    }

    /**
     * Applies one `message_template_status_update` webhook.
     *
     * Meta reviews templates on its own schedule, so this is how an approval
     * becomes sendable without anyone opening the admin and hitting refresh.
     */
    async applyTemplateStatusUpdate(
        tenantId: string,
        input: { templateName: string; language: WhatsAppLanguage; status: string; reason?: string | null }
    ) {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        const config = parseWhatsAppConfig(integration?.config)
        if (!integration || !config) return

        const kind = (Object.keys(TEMPLATE_NAMES) as WhatsAppTemplateKind[]).find(
            (candidate) => TEMPLATE_NAMES[candidate] === input.templateName
        )
        const status = input.status.trim().toUpperCase()
        if (!kind || !status) return

        const templates = { ...(config.templates ?? {}) }
        const state: WhatsAppTemplateState = templates[kind] ?? { name: input.templateName, languages: {} }

        state.languages = {
            ...state.languages,
            [input.language]: {
                status,
                reason: input.reason ?? null,
                metaId: state.languages[input.language]?.metaId ?? null,
                syncedAt: new Date().toISOString()
            }
        }
        templates[kind] = state

        await this.persist(tenantId, integration.isActive, config, { templates })
    }

    private async persist(
        tenantId: string,
        isActive: boolean,
        config: WhatsAppConfig,
        patch: Partial<WhatsAppConfig>
    ) {
        await this.integrations.upsertIntegration(tenantId, WHATSAPP_PROVIDER, { ...config, ...patch }, isActive)
    }
}

export const whatsappTemplatesService = new WhatsAppTemplatesService()
