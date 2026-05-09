import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ModernThemeProvider from '../../components/storefront/templates/modern/ThemeProvider.vue'

describe('ModernThemeProvider', () => {
    it('uses teal as the modern template brand color', () => {
        const wrapper = mount(ModernThemeProvider, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })]
            },
            slots: {
                default: '<div>Modern storefront</div>'
            }
        })

        const style = (wrapper.element as HTMLElement).style

        expect(style.getPropertyValue('--brand')).toBe('#0D9488')
        expect(style.getPropertyValue('--brand-rgb')).toBe('13 148 136')
        expect(wrapper.text()).toContain('Modern storefront')
    })

    it('does not inherit the surrounding SaaS brand color', () => {
        const Host = defineComponent({
            components: { ModernThemeProvider },
            template: `
                <div style="--brand: #C6F432; --brand-rgb: 198 244 50">
                    <ModernThemeProvider>
                        <div>Modern storefront</div>
                    </ModernThemeProvider>
                </div>
            `
        })

        const wrapper = mount(Host, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })]
            }
        })

        const provider = wrapper.findComponent(ModernThemeProvider)
        const style = (provider.element as HTMLElement).style

        expect(style.getPropertyValue('--brand')).toBe('#0D9488')
        expect(style.getPropertyValue('--brand-rgb')).toBe('13 148 136')
    })
})
