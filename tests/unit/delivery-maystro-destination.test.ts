import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeliveryService } from '../../backend/src/modules/delivery/delivery.service'
import { MaystroLocationService } from '../../backend/src/modules/delivery/maystro/maystro-location.service'

describe('DeliveryService Maystro destination fallback', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('uses address + commune/wilaya names when address is provided', async () => {
        const resolveSpy = vi.spyOn(MaystroLocationService.prototype, 'resolveWilayaAndCommune').mockResolvedValue({
            wilayaId: 16,
            wilayaName: 'Alger',
            communeId: 575,
            communeName: 'Hydra'
        })

        const service = new DeliveryService()
        const destination = await (service as any).buildMaystroDestinationText({
            apiToken: 'token',
            wilayaCode: '16',
            communeCode: '575',
            addressLine1: '123 Rue Test',
            addressLine2: 'Apt 4'
        })

        expect(destination).toBe('123 Rue Test, Apt 4, Hydra, Alger')
        expect(resolveSpy).toHaveBeenCalledOnce()
    })

    it('falls back to commune + wilaya names when address is missing', async () => {
        vi.spyOn(MaystroLocationService.prototype, 'resolveWilayaAndCommune').mockResolvedValue({
            wilayaId: 16,
            wilayaName: 'Alger',
            communeId: 575,
            communeName: 'Hydra'
        })

        const service = new DeliveryService()
        const destination = await (service as any).buildMaystroDestinationText({
            apiToken: 'token',
            wilayaCode: '16',
            communeCode: '575'
        })

        expect(destination).toBe('Hydra, Alger')
    })

    it('falls back to raw codes if location name lookup fails', async () => {
        vi.spyOn(MaystroLocationService.prototype, 'resolveWilayaAndCommune').mockRejectedValue(new Error('lookup failed'))

        const service = new DeliveryService()
        const destination = await (service as any).buildMaystroDestinationText({
            apiToken: 'token',
            wilayaCode: '16',
            communeCode: '575'
        })

        expect(destination).toBe('575, 16')
    })
})
