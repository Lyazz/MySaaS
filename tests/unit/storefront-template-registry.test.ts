import { describe, expect, it } from 'vitest'

import {
    DEFAULT_TEMPLATE,
    aboutPageTemplates,
    cartTemplates,
    categoryTemplates,
    checkoutTemplates,
    contactPageTemplates,
    homeTemplates,
    productCardTemplates,
    productLandingPageTemplates,
    productTemplates,
    resolveTemplateKey,
    shopTemplates,
    storeShellTemplates,
    themeProviderTemplates,
    wishlistTemplates
} from '../../components/storefront/templates/registry'
import { TEMPLATE_ORIGINAL_BRAND_COLORS } from '../../shared/storefront/template-brand'

/*
 * A template is only usable once it is wired into every surface map. Adding one
 * means touching thirteen objects plus the resolver, and the failure mode is
 * silent: a key present in `homeTemplates` but missing from `checkoutTemplates`
 * only shows up when a customer reaches checkout. These tests pin the maps to
 * each other so a half-registered template fails here instead.
 */

// `homeTemplates` is the reference set: every other map must match it exactly.
const templateKeys = Object.keys(homeTemplates)

const surfaceMaps: Record<string, Record<string, unknown>> = {
    productTemplates,
    productCardTemplates,
    categoryTemplates,
    storeShellTemplates,
    shopTemplates,
    checkoutTemplates,
    cartTemplates,
    aboutPageTemplates,
    contactPageTemplates,
    themeProviderTemplates,
    productLandingPageTemplates,
    wishlistTemplates
}

describe('storefront template registry', () => {
    it('registers every template on every storefront surface', () => {
        for (const [name, map] of Object.entries(surfaceMaps)) {
            expect({ [name]: Object.keys(map).sort() }).toEqual({ [name]: [...templateKeys].sort() })
        }
    })

    it('binds every surface entry to an actual component', () => {
        for (const [name, map] of Object.entries(surfaceMaps)) {
            for (const key of templateKeys) {
                expect(map[key], `${name}.${key} is not bound`).toBeTruthy()
            }
        }
    })

    it('resolves every registered key and falls back for anything else', () => {
        for (const key of templateKeys) {
            expect(resolveTemplateKey(key)).toBe(key)
        }

        expect(resolveTemplateKey('not-a-template')).toBe(DEFAULT_TEMPLATE)
        expect(resolveTemplateKey('')).toBe(DEFAULT_TEMPLATE)
        expect(resolveTemplateKey(null)).toBe(DEFAULT_TEMPLATE)
        expect(resolveTemplateKey(undefined)).toBe(DEFAULT_TEMPLATE)
    })

    it('gives every registered template an original brand colour', () => {
        // The colour table also covers retired keys, so this is a subset check.
        for (const key of templateKeys) {
            expect(
                TEMPLATE_ORIGINAL_BRAND_COLORS[key as keyof typeof TEMPLATE_ORIGINAL_BRAND_COLORS],
                `${key} has no entry in TEMPLATE_ORIGINAL_BRAND_COLORS`
            ).toMatch(/^#[0-9A-Fa-f]{6}$/)
        }
    })

    it('keeps Embellir wired in', () => {
        expect(templateKeys).toContain('embellir')
        expect(resolveTemplateKey('embellir')).toBe('embellir')
        expect(TEMPLATE_ORIGINAL_BRAND_COLORS.embellir).toBe('#0E3F3A')
    })
})
