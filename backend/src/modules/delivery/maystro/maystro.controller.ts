import type { Request, Response } from 'express'
import prisma from '../../../lib/prisma'
import { MaystroLocationService } from './maystro-location.service'
import { MaystroPickupPointService } from './maystro-pickup-point.service'
import { MaystroDeliveryService } from './maystro-delivery.service'
import { MaystroHooksService } from './maystro-hooks.service'
import { MaystroBordereauService } from './maystro-bordereau.service'
import { MaystroIntegrationError } from './maystro.errors'
import { getMaystroCredentials } from './maystro.credentials'

export class MaystroController {
    private location = new MaystroLocationService()
    private pickupPoints = new MaystroPickupPointService()
    private delivery = new MaystroDeliveryService()
    private hooks = new MaystroHooksService()
    private bordereau = new MaystroBordereauService()

    async listWilayas(req: Request, res: Response) {
        try {
            const wilayas = await this.location.listWilayas({
                language: typeof req.query.language === 'string' ? req.query.language : undefined,
                country: typeof req.query.country === 'string' ? req.query.country : undefined
            })
            return res.json(wilayas)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro wilayas error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listCommunes(req: Request, res: Response) {
        const wilaya = typeof req.query.wilaya === 'string' ? req.query.wilaya : ''
        if (!wilaya.trim()) return res.status(400).json({ statusCode: 400, statusMessage: 'wilaya is required' })

        try {
            const communes = await this.location.listCommunes({ wilaya })
            return res.json(communes)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro communes error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listPickupPoints(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const commune = typeof req.query.commune === 'string' ? req.query.commune : ''
        if (!commune.trim()) return res.status(400).json({ statusCode: 400, statusMessage: 'commune is required' })

        const wilaya = typeof req.query.wilaya === 'string' ? req.query.wilaya : ''
        const nearby = String(req.query.nearby || '').toLowerCase() === 'true'

        const deliveryTypeRaw = typeof req.query.deliveryType === 'string' ? Number(req.query.deliveryType) : null
        const deliveryType = deliveryTypeRaw === 2 || deliveryTypeRaw === 3 ? (deliveryTypeRaw as 2 | 3) : undefined

        try {
            const creds = await getMaystroCredentials(tenantId)
            const points = nearby && wilaya.trim()
                ? await this.pickupPoints.listActivePickupPointsNearby({ apiToken: creds.apiToken, commune, wilaya, deliveryType })
                : await this.pickupPoints.listActivePickupPoints({ apiToken: creds.apiToken, commune, deliveryType })
            return res.json(points)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro pickup points error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listDeliveryOptions(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const commune = typeof req.query.commune === 'string' ? req.query.commune : ''
        if (!commune.trim()) return res.status(400).json({ statusCode: 400, statusMessage: 'commune is required' })

        try {
            const creds = await getMaystroCredentials(tenantId)
            const options = await this.delivery.listDeliveryOptions({ apiToken: creds.apiToken, commune })
            return res.json(options)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro delivery options error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async getDeliveryPrice(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const commune = typeof req.query.commune === 'string' ? req.query.commune : ''
        const deliveryType = typeof req.query.deliveryType === 'string' ? Number(req.query.deliveryType) : NaN
        if (!commune.trim()) return res.status(400).json({ statusCode: 400, statusMessage: 'commune is required' })
        if (!Number.isFinite(deliveryType)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'deliveryType is required' })
        }

        try {
            const creds = await getMaystroCredentials(tenantId)
            const price = await this.delivery.getDeliveryPrice({ apiToken: creds.apiToken, commune, deliveryType })
            return res.json(price)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro delivery price error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listHookTypes(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        try {
            const creds = await getMaystroCredentials(tenantId)
            const types = await this.hooks.listTypes({ apiToken: creds.apiToken })
            return res.json(types)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro hook types error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listHooks(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        try {
            const creds = await getMaystroCredentials(tenantId)
            const hooks = await this.hooks.listHooks({ apiToken: creds.apiToken })
            return res.json(hooks)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro list hooks error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async createHook(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : ''
        const triggerTypeId = typeof req.body?.trigger_type_id === 'number' ? req.body.trigger_type_id : Number(req.body?.trigger_type_id)

        if (!endpoint) return res.status(400).json({ statusCode: 400, statusMessage: 'endpoint is required' })
        if (!Number.isFinite(triggerTypeId)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'trigger_type_id is required' })
        }

        try {
            const creds = await getMaystroCredentials(tenantId)
            const created = await this.hooks.createHook({ apiToken: creds.apiToken, endpoint, triggerTypeId })
            return res.status(201).json(created)
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro create hook error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async deleteHook(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const id = Number(req.params.id)
        if (!Number.isFinite(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid id' })

        try {
            const creds = await getMaystroCredentials(tenantId)
            const out = await this.hooks.deleteHook({ apiToken: creds.apiToken, id })
            return res.json(out ?? { success: true })
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro delete hook error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async createBordereau(req: Request, res: Response) {
        const tenantId = req.tenant?.id || req.user?.tenantId
        if (!tenantId) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const allCreated = req.body?.all_created === true || req.body?.allCreated === true
        const explicitOrdersIds = Array.isArray(req.body?.orders_ids) ? req.body.orders_ids : null
        const localOrderIds = Array.isArray(req.body?.orderIds) ? req.body.orderIds : null

        try {
            const creds = await getMaystroCredentials(tenantId)

            let ordersIds: string[] = []
            if (explicitOrdersIds) {
                ordersIds = explicitOrdersIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
            } else if (localOrderIds) {
                const ids = localOrderIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
                const shipments = await prisma.shipment.findMany({
                    where: { tenantId, provider: 'MAYSTRO', orderId: { in: ids } },
                    select: { providerShipmentId: true }
                })
                ordersIds = shipments.map((s) => s.providerShipmentId).filter((id): id is string => Boolean(id))
                if (ordersIds.length === 0) {
                    // Bordereau requires display_id (= tracking), not the UUID (maystroOrderId)
                    const mappings = await prisma.maystroOrderMapping.findMany({
                        where: { tenantId, localOrderId: { in: ids }, tracking: { not: null } },
                        select: { tracking: true, maystroOrderId: true }
                    })
                    ordersIds = mappings
                        .map((m) => m.tracking ?? m.maystroOrderId)
                        .filter((id): id is string => Boolean(id))
                }
            }

            const pdf = await this.bordereau.createBordereauPdf({
                apiToken: creds.apiToken,
                allCreated,
                ordersIds
            })

            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', 'inline; filename="bordereau.pdf"')
            return res.send(Buffer.from(pdf))
        } catch (error: any) {
            if (error instanceof MaystroIntegrationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Maystro bordereau error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
