import { describe, expect, it, vi, afterEach } from 'vitest'
import { DeliveryService } from '../../backend/src/modules/delivery/delivery.service'
import { MaystroProvider } from '../../backend/src/modules/delivery/providers/maystro.provider'
import { MaystroClient } from '../../backend/src/modules/delivery/maystro/maystro.client'
import { MaystroLocationService } from '../../backend/src/modules/delivery/maystro/maystro-location.service'

// Béjaïa as the two carriers actually publish it. The same real commune is "Beni Maouch"
// to Maystro and "Aït Maouche" to Yalidine, and nothing joins the two — they share no
// identifier and no normaliser bridges the spellings.
const MAYSTRO_COMMUNES = [
    { id: '178', name: 'Bejaia' },
    { id: '201', name: 'Adekar' },
    { id: '227', name: 'Beni Maouch' }
]
const YALIDINE_COMMUNES = [
    { id: '0601', name: 'Bejaia' },
    { id: '0620', name: 'Adekar' },
    { id: '0645', name: 'Aït Maouche' }
]

const serviceWith = (offered: string[], catalogues: Record<string, any[]>) => {
    const svc = new DeliveryService({} as any) as any
    vi.spyOn(svc, 'getOfferedProviders').mockResolvedValue(offered)
    vi.spyOn(svc, 'resolveProvider').mockImplementation(async (_t: string, provider: string) => ({
        impl: catalogues[provider]
            ? { listCommunes: async () => catalogues[provider] }
            : {},
        apiConfig: null
    }))
    return svc
}

afterEach(() => vi.restoreAllMocks())

describe('per-carrier commune identity', () => {
    it('gives every merged entry the id of each carrier that publishes it', async () => {
        const svc = serviceWith(['MAYSTRO', 'YALIDINE'], {
            MAYSTRO: MAYSTRO_COMMUNES,
            YALIDINE: YALIDINE_COMMUNES
        })

        const communes = await svc.listCommuneNames(`t-${Date.now()}-a`, '06')
        const byName = Object.fromEntries(communes.map((c: any) => [c.name, c.ids]))

        // Same spelling in both catalogues -> one row carrying both ids.
        expect(byName['Bejaia']).toEqual({ MAYSTRO: '178', YALIDINE: '0601' })
        expect(byName['Adekar']).toEqual({ MAYSTRO: '201', YALIDINE: '0620' })

        // Divergent spellings stay two rows, each usable by the carrier behind it.
        expect(byName['Beni Maouch']).toEqual({ MAYSTRO: '227' })
        expect(byName['Aït Maouche']).toEqual({ YALIDINE: '0645' })
    })

    it('translates a picked name into the asked carrier\'s own id', async () => {
        const svc = serviceWith(['MAYSTRO', 'YALIDINE'], {
            MAYSTRO: MAYSTRO_COMMUNES,
            YALIDINE: YALIDINE_COMMUNES
        })
        const tenantId = `t-${Date.now()}-b`

        expect(
            await svc.matchProviderCommune({ tenantId, provider: 'MAYSTRO', wilayaCode: '06', commune: 'Beni Maouch' })
        ).toEqual({ kind: 'resolved', id: '227' })

        expect(
            await svc.matchProviderCommune({ tenantId, provider: 'YALIDINE', wilayaCode: '06', commune: 'Aït Maouche' })
        ).toEqual({ kind: 'resolved', id: '0645' })
    })

    it('says "not carried" rather than substituting another commune', async () => {
        const svc = serviceWith(['MAYSTRO'], { MAYSTRO: MAYSTRO_COMMUNES })

        // Yalidine's spelling asked of Maystro. The old code fell through to the wilaya's
        // first commune and quoted a price for somewhere else.
        expect(
            await svc.matchProviderCommune({
                tenantId: `t-${Date.now()}-c`,
                provider: 'MAYSTRO',
                wilayaCode: '06',
                commune: 'Aït Maouche'
            })
        ).toEqual({ kind: 'not-carried' })
    })

    it('passes a value through untouched for a carrier with no commune catalogue', async () => {
        const svc = serviceWith(['SELF'], {})

        // SELF prices flat or by wilaya; there is nothing to resolve against, and it must
        // not be dropped from checkout just because it publishes no communes.
        expect(
            await svc.matchProviderCommune({
                tenantId: `t-${Date.now()}-d`,
                provider: 'SELF',
                wilayaCode: '06',
                commune: 'Anywhere'
            })
        ).toEqual({ kind: 'no-catalogue' })
    })

    it('takes an already-numeric value as the carrier\'s own id', async () => {
        const svc = serviceWith(['MAYSTRO'], { MAYSTRO: MAYSTRO_COMMUNES })

        expect(
            await svc.matchProviderCommune({
                tenantId: `t-${Date.now()}-e`,
                provider: 'MAYSTRO',
                wilayaCode: '06',
                commune: '227'
            })
        ).toEqual({ kind: 'resolved', id: '227' })
    })

    it('falls back to the static dataset only when no carrier answers', async () => {
        const svc = serviceWith(['MAYSTRO'], {})

        const communes = await svc.listCommuneNames(`t-${Date.now()}-f`, '06')
        expect(communes.length).toBeGreaterThan(10)
        // Static entries carry no carrier id, which is honest: no carrier claimed them.
        expect(communes.every((c: any) => Object.keys(c.ids).length === 0)).toBe(true)
    })
})

describe('quoting a commune the carrier does not carry', () => {
    const mockMaystroQuote = (provider: MaystroProvider, priceByCommune: Record<string, number>) => {
        vi.spyOn(provider as any, 'listCommunesForWilaya').mockResolvedValue([
            { id: 178, name: 'Bejaia' },
            { id: 227, name: 'Beni Maouch' }
        ])
        vi.spyOn(MaystroLocationService.prototype, 'listWilayas').mockResolvedValue([
            { id: 6, name: 'Bejaia', centerCommune: 178 }
        ] as any)
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async ({ params }: any) => ({
            delivery_price: priceByCommune[String(params.commune)] ?? 0
        }))
    }

    it('declines to price home delivery rather than quoting another commune', async () => {
        const provider = new MaystroProvider({ apiToken: 't' })
        mockMaystroQuote(provider, { '178': 400, '227': 600 })

        // "Aït Maouche" is Yalidine's spelling; Maystro has no such commune. Quoting the
        // wilaya's first commune here is what used to show a price for somewhere else.
        const quotes = await provider.quote({
            tenantId: 't1',
            provider: 'MAYSTRO',
            deliveryMode: 'home',
            destination: { wilayaCode: '6', communeCode: 'Aït Maouche' }
        } as any)

        expect(quotes).toEqual([])
    })

    it('still prices desk collection, which is wilaya-scoped', async () => {
        const provider = new MaystroProvider({ apiToken: 't' })
        mockMaystroQuote(provider, { '178': 450 })

        // One desk per wilaya, sited in the centre commune, same price for every commune of
        // it — so this is the true answer, not a substitution.
        const quotes = await provider.quote({
            tenantId: 't1',
            provider: 'MAYSTRO',
            deliveryMode: 'office',
            destination: { wilayaCode: '6', communeCode: 'Aït Maouche' }
        } as any)

        expect(quotes).toHaveLength(1)
        expect(quotes[0].price).toBe(450)
    })

    it('prices a commune it does carry from that commune', async () => {
        const provider = new MaystroProvider({ apiToken: 't' })
        mockMaystroQuote(provider, { '178': 450, '227': 600 })

        const quotes = await provider.quote({
            tenantId: 't1',
            provider: 'MAYSTRO',
            deliveryMode: 'home',
            destination: { wilayaCode: '6', communeCode: 'Beni Maouch' }
        } as any)

        expect(quotes[0].price).toBe(600)
    })
})
