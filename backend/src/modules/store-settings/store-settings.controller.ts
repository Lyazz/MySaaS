import type { Request, Response } from 'express'
import { StoreSettingsService, StoreSettingsValidationError } from './store-settings.service'

const service = new StoreSettingsService()

export class StoreSettingsController {
    async getAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const settings = await service.getOrCreate(tenant.id)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ...settings, name: tenant.name, slug: tenant.slug }))
        } catch (error) {
            console.error('Get store settings error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async patchAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const body = req.body ?? {}

            try {
                const updated = await service.update(tenant.id, body)
                res.json(updated)
            } catch (e: any) {
                if (e instanceof StoreSettingsValidationError) {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
                }
                throw e
            }
        } catch (error) {
            console.error('Patch store settings error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async agentSummary(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const settings = await service.getOrCreate(tenant.id)

            const { markdown, data } = service.buildFrontendAgentSummary({
                tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
                settings: {
                    logoUrl: settings.logoUrl,
                    faviconUrl: settings.faviconUrl,
                    primaryColor: settings.primaryColor,
                    useBrandColor: (settings as any).useBrandColor ?? false,
                    templateKey: settings.templateKey,
                    announcementText: settings.announcementText,
                    announcementScrolling: settings.announcementScrolling,
                    language: settings.language,
                    cartEnabled: settings.cartEnabled,
                    codEnabled: settings.codEnabled,
                    orderIdPrefix: settings.orderIdPrefix,
                    minimumOrderAmountDzd: settings.minimumOrderAmountDzd,
                    hideOptionalAddress: settings.hideOptionalAddress,
                    currencyCode: settings.currencyCode,
                    currencyCountry: settings.currencyCountry
                }
            })

            res.json({ markdown, data })
        } catch (error) {
            console.error('Store agent summary error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async getChecklist(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const checklist = await service.getOnboardingChecklist(tenant.id)
            res.json(checklist)
        } catch (error) {
            console.error('Get onboarding checklist error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async publish(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            await service.publishStore(tenant.id)
            res.json({ success: true })
        } catch (error) {
            console.error('Publish store error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async getPublic(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            if (!tenant) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
            }

            const settings = await service.getOrCreate(tenant.id)
            res.json({
                tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
                storeSettings: {
                    logoUrl: settings.logoUrl,
                    faviconUrl: settings.faviconUrl,
                    primaryColor: settings.primaryColor,
                    useBrandColor: (settings as any).useBrandColor ?? false,
                    templateKey: settings.templateKey,
                    announcementText: settings.announcementText,
                    announcementScrolling: settings.announcementScrolling,
                    language: settings.language,
                    cartEnabled: settings.cartEnabled,
                    codEnabled: settings.codEnabled,
                    orderIdPrefix: settings.orderIdPrefix,
                    minimumOrderAmountDzd: settings.minimumOrderAmountDzd,
                    hideOptionalAddress: settings.hideOptionalAddress,
                    currencyCode: settings.currencyCode,
                    currencyCountry: settings.currencyCountry,
                    allowedDeliveryProviders: settings.allowedDeliveryProviders,
                    storePickupEnabled: settings.storePickupEnabled,
                    loyaltyEnabled: settings.loyaltyEnabled,
                    loyaltyMinRedeemPoints: settings.loyaltyMinRedeemPoints,
                    loyaltyRedeemRateDzdPerPoint: settings.loyaltyRedeemRateDzdPerPoint,
                    loyaltyPublicFormulaMode: settings.loyaltyPublicFormulaMode,
                    legalPages: settings.legalPages
                }
            })
        } catch (error) {
            console.error('Public store settings error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
