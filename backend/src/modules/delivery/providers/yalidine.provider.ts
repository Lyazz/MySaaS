import type { Shipment, ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    ProviderCommune,
    ProviderPickupPoint,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'
import { YalidineClient } from '../yalidine/yalidine.client'
import { YalidineIntegrationError } from '../yalidine/yalidine.errors'
import { YalidineLocationService } from '../yalidine/yalidine-location.service'
import { yalidineStatusToShipmentStatus } from '../yalidine/yalidine-status'
import { normalizeLocationName } from '../shared/normalize-location-name'

type YalidineFeeResponse = {
    from_wilaya_name?: string
    to_wilaya_name?: string
    oversize_fee?: number
    per_commune?: Record<
        string,
        {
            commune_id?: number
            commune_name?: string
            express_home?: number | null
            express_desk?: number | null
            economic_home?: number | null
            economic_desk?: number | null
        }
    >
}

type YalidineCreateParcelResult = {
    success?: boolean
    order_id?: string
    tracking?: string | null
    label?: string | null
    message?: string
    [key: string]: any
}

const DEFAULT_ORIGIN_WILAYA_ID = 16
const DEFAULT_ORIGIN_WILAYA_NAME = 'Alger'

const parsePositiveNumber = (value: unknown): number | null => {
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) && n > 0 ? n : null
}

const parsePositiveInt = (value: unknown): number | null => {
    const n = Number.parseInt(String(value ?? '').trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
}

const serviceLevelPrefix = (serviceLevel?: string) =>
    String(serviceLevel || '').trim().toLowerCase().startsWith('economic') ? 'economic' : 'express'

const deliveryModeSuffix = (deliveryMode?: 'home' | 'office') => (deliveryMode === 'office' ? 'desk' : 'home')

const splitContactName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { firstname: 'Client', familyname: '-' }
    if (parts.length === 1) return { firstname: parts[0], familyname: '-' }
    return { firstname: parts[0], familyname: parts.slice(1).join(' ') }
}

const productListFromMetadata = (metadata: Record<string, any> | undefined) => {
    const rawItems = Array.isArray(metadata?.items) ? metadata.items : []
    const labels = rawItems
        .map((item: any) => {
            const title = String(item?.title ?? item?.name ?? item?.description ?? '').trim()
            const quantity = parsePositiveInt(item?.quantity) ?? 1
            if (!title) return ''
            return quantity > 1 ? `${quantity} x ${title}` : title
        })
        .filter(Boolean)

    return labels.length ? labels.join(', ') : String(metadata?.productList ?? metadata?.description ?? 'Commande').trim()
}

const declaredAmount = (input: CreateShipmentInput) => {
    const amount = parsePositiveNumber(input.codAmount ?? input.price) ?? 0
    return Math.min(150000, Math.max(0, Math.round(amount)))
}

const parcelDimension = (metadata: Record<string, any> | undefined, key: string, fallback: number) => {
    const value = parsePositiveNumber(metadata?.yalidine?.[key] ?? metadata?.[key])
    return value == null ? fallback : Math.round(value)
}

export class YalidineProvider implements DeliveryProvider {
    provider: ShipmentProvider = 'YALIDINE'
    private client: YalidineClient | null
    private location: YalidineLocationService | null
    private originWilayaId?: number
    private originWilayaName?: string

    constructor(opts?: {
        apiId?: string
        apiToken?: string
        baseURL?: string
        originWilayaId?: string | number
        originWilayaName?: string
    }) {
        const apiId = typeof opts?.apiId === 'string' ? opts.apiId.trim() : ''
        const apiToken = typeof opts?.apiToken === 'string' ? opts.apiToken.trim() : ''
        this.client = apiId && apiToken ? new YalidineClient({ apiId, apiToken, baseURL: opts?.baseURL }) : null
        this.location = this.client ? new YalidineLocationService(this.client) : null
        this.originWilayaId =
            parsePositiveInt(opts?.originWilayaId) ??
            parsePositiveInt(process.env.YALIDINE_ORIGIN_WILAYA_ID ?? process.env.YALIDINE_ORIGIN_WILAYA) ??
            DEFAULT_ORIGIN_WILAYA_ID
        this.originWilayaName =
            typeof opts?.originWilayaName === 'string' && opts.originWilayaName.trim()
                ? opts.originWilayaName.trim()
                : process.env.YALIDINE_ORIGIN_WILAYA_NAME || DEFAULT_ORIGIN_WILAYA_NAME
    }

    private requireClient() {
        if (!this.client || !this.location) {
            throw new YalidineIntegrationError({
                statusCode: 400,
                statusMessage: 'Yalidine credentials are not configured'
            })
        }
        return { client: this.client, location: this.location }
    }

    private async resolveOriginWilayaName() {
        if (this.originWilayaName) return this.originWilayaName
        const { location } = this.requireClient()
        return (await location.resolveWilaya(this.originWilayaId ?? DEFAULT_ORIGIN_WILAYA_ID)).name
    }

    private calculateWeightFee(input: { weight?: number; oversizeFee?: number | null }) {
        const weight = typeof input.weight === 'number' && Number.isFinite(input.weight) ? input.weight : 1
        const oversizeFee = typeof input.oversizeFee === 'number' && Number.isFinite(input.oversizeFee) ? input.oversizeFee : 0
        if (weight <= 5 || oversizeFee <= 0) return 0
        return Math.ceil(weight - 5) * oversizeFee
    }

    async quote(input: QuoteRequest): Promise<QuoteOption[]> {
        const { client } = this.requireClient()
        const fromWilayaId = parsePositiveInt(input.originWilayaCode) ?? this.originWilayaId ?? DEFAULT_ORIGIN_WILAYA_ID
        const toWilayaId = parsePositiveInt(input.destination.wilayaCode)
        if (!toWilayaId) return []

        try {
            const data = await client.request<YalidineFeeResponse>({
                method: 'GET',
                path: '/fees/',
                params: { from_wilaya_id: fromWilayaId, to_wilaya_id: toWilayaId }
            })

            const feesByCommune = data?.per_commune && typeof data.per_commune === 'object' ? data.per_commune : {}
            const feeKey = `${serviceLevelPrefix(input.serviceLevel)}_${deliveryModeSuffix(input.deliveryMode)}`
            const rawCommune = String(input.destination.communeCode ?? '').trim()
            const communeId = parsePositiveInt(rawCommune)
            const candidates = Object.values(feesByCommune)
            const selected = communeId
                ? feesByCommune[String(communeId)] ?? candidates.find((c) => Number(c?.commune_id) === communeId)
                : rawCommune
                    ? candidates.find((c) => normalizeLocationName(c?.commune_name ?? '') === normalizeLocationName(rawCommune))
                    : candidates
                        .filter((c) => parsePositiveNumber((c as any)?.[feeKey]) != null)
                        .sort((a, b) => Number((a as any)[feeKey]) - Number((b as any)[feeKey]))[0]

            const basePrice = parsePositiveNumber((selected as any)?.[feeKey])
            if (basePrice == null) return []

            return [
                {
                    provider: this.provider,
                    serviceLevel: input.serviceLevel,
                    price: basePrice + this.calculateWeightFee({ weight: input.weight, oversizeFee: data?.oversize_fee }),
                    currency: 'DZD',
                    source: 'provider'
                }
            ]
        } catch {
            return []
        }
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        const { client, location } = this.requireClient()
        if (!input.communeCode || !input.wilayaCode) {
            throw new YalidineIntegrationError({
                statusCode: 400,
                statusMessage: 'Yalidine: wilayaCode and communeCode are required'
            })
        }

        const destination = await location.resolveWilayaAndCommune({
            wilaya: input.wilayaCode,
            commune: input.communeCode
        })
        const names = splitContactName(input.contactName)
        const amount = declaredAmount(input)
        const metadata = input.metadata || {}
        const yalidineMeta = metadata.yalidine && typeof metadata.yalidine === 'object' ? metadata.yalidine : {}
        const isStopDesk = input.deliveryMode === 'office'
        const stopdeskId =
            yalidineMeta.stopdeskId ??
            metadata.stopdeskId ??
            metadata.pickupPoint ??
            metadata.yalidineStopdeskId ??
            undefined

        if (isStopDesk && !String(stopdeskId ?? '').trim()) {
            throw new YalidineIntegrationError({
                statusCode: 400,
                statusMessage: 'Yalidine: stopdesk_id is required for office delivery'
            })
        }

        const parcel = {
            order_id: input.orderId,
            from_wilaya_name: await this.resolveOriginWilayaName(),
            firstname: names.firstname,
            familyname: names.familyname,
            contact_phone: input.contactPhone,
            address: input.addressLine1,
            to_commune_name: destination.communeName,
            to_wilaya_name: destination.wilayaName,
            product_list: productListFromMetadata(metadata),
            price: amount,
            do_insurance: yalidineMeta.doInsurance === true || metadata.doInsurance === true,
            declared_value: Math.round(parsePositiveNumber(yalidineMeta.declaredValue ?? metadata.declaredValue) ?? amount),
            length: parcelDimension(metadata, 'length', 0),
            width: parcelDimension(metadata, 'width', 0),
            height: parcelDimension(metadata, 'height', 0),
            weight: parcelDimension(metadata, 'weight', 1),
            freeshipping: yalidineMeta.freeShipping ?? metadata.freeShipping ?? true,
            is_stopdesk: isStopDesk,
            stopdesk_id: isStopDesk ? String(stopdeskId) : undefined,
            has_exchange: yalidineMeta.hasExchange === true || metadata.hasExchange === true,
            product_to_collect: yalidineMeta.productToCollect ?? metadata.productToCollect
        }

        const response = await client.request<Record<string, YalidineCreateParcelResult> | YalidineCreateParcelResult[]>({
            method: 'POST',
            path: '/parcels/',
            data: [parcel]
        })

        const result = Array.isArray(response) ? response[0] : response?.[input.orderId] ?? Object.values(response || {})[0]
        if (!result || result.success === false) {
            throw new YalidineIntegrationError({
                statusCode: 400,
                statusMessage: result?.message || 'Yalidine: parcel creation failed',
                details: result
            })
        }

        return {
            providerShipmentId: result.tracking ? String(result.tracking) : undefined,
            status: result.tracking ? 'REQUESTED' : 'PENDING',
            labelUrl: result.label ? String(result.label) : null,
            trackingUrl: result.tracking ? `https://yalidine.app/tracking/${encodeURIComponent(String(result.tracking))}` : null,
            price: input.price,
            currency: input.currency || 'DZD',
            raw: { request: parcel, response: result }
        }
    }

    async track(shipment: Shipment): Promise<TrackingEvent[]> {
        if (!shipment.providerShipmentId) return []
        const { client } = this.requireClient()
        const data = await client.request<any>({
            method: 'GET',
            path: `/histories/${encodeURIComponent(shipment.providerShipmentId)}`
        })
        const rawEvents = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data ? [data] : []
        return rawEvents.map((event: any) => ({
            status: yalidineStatusToShipmentStatus(event?.status ?? event?.status_id),
            code: event?.status_id != null ? String(event.status_id) : event?.status ? String(event.status) : undefined,
            description: [event?.status, event?.reason].filter(Boolean).join(' - ') || undefined,
            eventTime: event?.date_status ? new Date(String(event.date_status).replace(' ', 'T')) : undefined,
            raw: event
        }))
    }

    async listCommunes(wilayaCode: string): Promise<ProviderCommune[]> {
        const { location } = this.requireClient()
        const wilaya = await location.resolveWilaya(wilayaCode)
        const communes = await location.listCommunes({ wilayaId: wilaya.id })
        return communes.map((c) => ({ id: String(c.id), name: c.name }))
    }

    /** Does this agency sit in the commune the customer typed (by id or by name)? */
    private static communeMatches(center: { communeId: number; communeName?: string }, commune: string): boolean {
        const id = parsePositiveInt(commune)
        if (id) return center.communeId === id
        return normalizeLocationName(center.communeName ?? '') === normalizeLocationName(commune)
    }

    async listPickupPoints(input: { wilayaCode: string; communeCode?: string }): Promise<ProviderPickupPoint[]> {
        const { location } = this.requireClient()
        const wilaya = await location.resolveWilaya(input.wilayaCode)

        // Always return the whole wilaya, with the customer's own commune first,
        // rather than filtering down to it. Yalidine runs a median of 3 agencies per
        // wilaya and only one in 15 of them, usually in the chef-lieu — filtering by
        // commune would hide the single agency from nearly every customer. Alger is
        // the one wilaya where the list is long (24), and there sorting is enough:
        // its agencies cover 23 of 57 communes, so most customers have none of their
        // own and need to see the neighbouring ones anyway.
        const all = await location.listCenters({ wilayaId: wilaya.id })
        const raw = String(input.communeCode ?? '').trim()

        const scoped = raw
            ? [...all].sort(
                  (a, b) =>
                      Number(YalidineProvider.communeMatches(b, raw)) - Number(YalidineProvider.communeMatches(a, raw))
              )
            : all

        return scoped.map((c) => ({
            id: String(c.id),
            name: c.name,
            address: c.address,
            communeId: String(c.communeId),
            communeName: c.communeName
        }))
    }
}
