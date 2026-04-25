import { describe, expect, it } from 'vitest'
import { PhoneNormalizationError, PhoneNormalizationService } from '../../backend/src/modules/loyalty/phone-normalization.service'

describe('PhoneNormalizationService', () => {
    const service = new PhoneNormalizationService()

    it('normalizes Algerian local mobile numbers to canonical 213 format', () => {
        expect(service.normalizeAlgerianPhone('0550 12 34 56').normalized).toBe('213550123456')
        expect(service.normalizeAlgerianPhone('+213 550 12 34 56').normalized).toBe('213550123456')
        expect(service.normalizeAlgerianPhone('213550123456').normalized).toBe('213550123456')
    })

    it('rejects invalid Algerian numbers', () => {
        expect(() => service.normalizeAlgerianPhone('12345')).toThrow(PhoneNormalizationError)
        expect(() => service.normalizeAlgerianPhone('+33123456789')).toThrow('valid Algerian phone number')
    })
})

