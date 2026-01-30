import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ModernStoreShell from '../../components/storefront/templates/modern/StoreShell.vue'
import { createTestingPinia } from '@pinia/testing'
import { useState } from '#imports'

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

describe('ModernStoreShell', () => {
    beforeEach(() => {
        // Mock useState for tenant and settings
        const mocks: Record<string, any> = {
            'tenant': { name: 'Test Tenant' },
            'storeSettings': { currencyCode: 'DZD', cartEnabled: true }
        }

        // Setup useState mock implementation
        vi.mocked(useState).mockImplementation((key: string, init?: () => any) => {
            if (init && !mocks[key]) mocks[key] = init()
            return { value: mocks[key] } as any
        })
    })

    it('renders header and announcement bar by default', () => {
        const wrapper = mount(ModernStoreShell, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    StoreThemeProvider: { template: '<div><slot /></div>' }
                }
            }
        })

        expect(wrapper.find('header').exists()).toBe(true)
        // Announcement bar checking: look for currency text
        expect(wrapper.text()).toContain('4,000 DZD')
    })

    it('hides header and announcement bar when hideNavigation prop is true', () => {
        const wrapper = mount(ModernStoreShell, {
            props: {
                hideNavigation: true
            },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    StoreThemeProvider: { template: '<div><slot /></div>' }
                }
            }
        })

        expect(wrapper.find('header').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('4,000 DZD')
    })
})
