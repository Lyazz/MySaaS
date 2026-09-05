import { describe, expect, it } from 'vitest'
import {
    hexToRgb,
    normalizeHexColor,
    resolveStorefrontTemplateBrandColor
} from '../../shared/storefront/template-brand'

describe('storefront template brand colors', () => {
    it('keeps the template original color by default', () => {
        expect(resolveStorefrontTemplateBrandColor('modern', { primaryColor: '#112233' })).toBe('#0D9488')
        expect(resolveStorefrontTemplateBrandColor('arena', null)).toBe('#00B8FC')
    })

    it('uses the tenant brand color only when override is enabled', () => {
        expect(resolveStorefrontTemplateBrandColor('modern', {
            primaryColor: '#112233',
            useBrandColor: true
        })).toBe('#112233')
    })

    it('normalizes hex colors and exposes rgb channel values', () => {
        expect(normalizeHexColor('#abc')).toBe('#AABBCC')
        expect(hexToRgb('#112233')).toBe('17 34 51')
    })
})
