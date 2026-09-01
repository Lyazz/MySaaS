import { describe, expect, it } from 'vitest'
import {
    TEMPLATE_BODY_PARAM_COUNT,
    TEMPLATE_LANGUAGES,
    TEMPLATE_NAMES,
    buildTemplateDefinition,
    sanitizeTemplateParam
} from '../../backend/src/modules/whatsapp/whatsapp-templates'
import { parseWhatsAppConfig } from '../../backend/src/modules/whatsapp/whatsapp.types'

describe('sanitizeTemplateParam', () => {
    it('flattens the newlines Meta rejects in a template parameter', () => {
        expect(sanitizeTemplateParam('- 2x Tee\n- 1x Cap')).toBe('- 2x Tee - 1x Cap')
        expect(sanitizeTemplateParam('a\t\tb    c')).toBe('a b c')
    })

    it('truncates instead of letting Meta reject an oversized parameter', () => {
        const long = 'x'.repeat(50)
        const result = sanitizeTemplateParam(long, 10)
        expect(result).toHaveLength(10)
        expect(result.endsWith('…')).toBe(true)
    })

    it('never returns an empty parameter', () => {
        expect(sanitizeTemplateParam('   ')).toBe('-')
        expect(sanitizeTemplateParam(null)).toBe('-')
    })
})

describe('buildTemplateDefinition', () => {
    it('bakes the tenant origin into the URL button and keeps the button order', () => {
        const definition = buildTemplateDefinition('CONFIRMATION', 'fr', 'https://demo.swekly.com/')

        expect(definition.name).toBe(TEMPLATE_NAMES.CONFIRMATION)
        expect(definition.category).toBe('UTILITY')

        const buttons = definition.components.find((component) => component.type === 'BUTTONS')
        expect(buttons).toBeDefined()
        const list = (buttons as { buttons: Array<{ type: string; url?: string }> }).buttons
        expect(list.map((button) => button.type)).toEqual(['QUICK_REPLY', 'QUICK_REPLY', 'URL'])
        expect(list[2].url).toBe('https://demo.swekly.com/confirm-order/{{1}}')
    })

    it('gives Meta one example per body variable, in every language', () => {
        for (const language of TEMPLATE_LANGUAGES) {
            for (const kind of ['CONFIRMATION', 'REMINDER'] as const) {
                const definition = buildTemplateDefinition(kind, language, 'https://demo.swekly.com')
                const body = definition.components.find((component) => component.type === 'BODY') as {
                    text: string
                    example?: { body_text: string[][] }
                }

                const variables = new Set(body.text.match(/\{\{\d+\}\}/g) ?? [])
                expect(variables.size).toBe(TEMPLATE_BODY_PARAM_COUNT)
                expect(body.example?.body_text[0]).toHaveLength(TEMPLATE_BODY_PARAM_COUNT)
            }
        }
    })
})

describe('parseWhatsAppConfig', () => {
    it('treats a half-finished connection as not configured', () => {
        expect(parseWhatsAppConfig(null)).toBeNull()
        expect(parseWhatsAppConfig({ wabaId: '1', phoneNumberId: '2' })).toBeNull()
    })

    it('defaults both toggles on and keeps approved template state', () => {
        const config = parseWhatsAppConfig({
            wabaId: '1',
            phoneNumberId: '2',
            accessToken: 'token',
            templates: {
                CONFIRMATION: { name: 'swekly_order_confirmation', languages: { fr: { status: 'approved' } } },
                NOPE: { name: 'ignored', languages: {} }
            }
        })

        expect(config?.autoSendEnabled).toBe(true)
        expect(config?.remindersEnabled).toBe(true)
        expect(config?.templates?.CONFIRMATION?.languages.fr?.status).toBe('APPROVED')
        expect(Object.keys(config?.templates ?? {})).toEqual(['CONFIRMATION'])
    })
})
