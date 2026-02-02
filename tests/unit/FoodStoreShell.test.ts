import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FoodStoreShell from '../../components/storefront/templates/food/StoreShell.vue'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent } from 'vue'

// Mock useFetch and other composables
vi.mock('#imports', async () => {
    const actual = await vi.importActual('#imports')
    return {
        ...actual,
        useState: vi.fn(),
        useFetch: vi.fn(() => ({ data: { value: [] } })),
        useTenantApiUrl: vi.fn((url) => url),
        useTenantApiHeaders: vi.fn(() => ({}))
    }
})

describe('FoodStoreShell', () => {
    beforeEach(async () => {
        // Mock useState for tenant and settings
        const mocks: Record<string, any> = {
            'tenant': { name: 'Test Tenant' },
            'storeSettings': { currencyCode: 'DZD', cartEnabled: true }
        }

        const { useState } = await import('#imports')

        // Setup useState mock implementation (auto-import composable)
        ;(useState as any).mockImplementation((key: string, init?: () => any) => {
            if (init && !mocks[key]) mocks[key] = init()
            return { value: mocks[key] } as any
        })
    })

    it('renders header and announcement bar by default', () => {
        const SuspenseWrapper = defineComponent({
            components: { FoodStoreShell },
            template: '<Suspense><FoodStoreShell /></Suspense>'
        })

        const wrapper = mount(SuspenseWrapper, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    StoreThemeProvider: { template: '<div><slot /></div>' }
                }
            }
        })

        return flushPromises().then(() => {
            expect(wrapper.find('header').exists()).toBe(true)
            // Announcement bar checking: look for currency text
            expect(wrapper.text()).toContain('4,000 DZD')
        })
    })

    it('hides header and announcement bar when hideNavigation prop is true', () => {
        const SuspenseWrapper = defineComponent({
            components: { FoodStoreShell },
            template: '<Suspense><FoodStoreShell :hideNavigation="true" /></Suspense>'
        })

        const wrapper = mount(SuspenseWrapper, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    StoreThemeProvider: { template: '<div><slot /></div>' }
                }
            }
        })

        return flushPromises().then(() => {
            expect(wrapper.find('header').exists()).toBe(false)
            expect(wrapper.text()).not.toContain('4,000 DZD')
        })
    })
})
