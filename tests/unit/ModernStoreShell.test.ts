import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ModernStoreShell from '../../components/storefront/templates/modern/StoreShell.vue'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, computed } from 'vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: computed(() => 'en')
    })
}))

// Mock useFetch and other composables
vi.mock('#imports', async () => {
    const actual = await vi.importActual('#imports')
    return {
        ...actual,
        useState: vi.fn(),
        useFetch: vi.fn(() => ({ data: { value: [] } })),
        useTenantApiUrl: vi.fn((url) => url),
        useTenantApiHeaders: vi.fn(() => ({})),
        useStoreLegalLinks: vi.fn(() =>
            computed(() => ({
                terms: { enabled: false, path: '/legal/terms' },
                privacy: { enabled: false, path: '/legal/privacy' },
                returns: { enabled: false, path: '/legal/returns' },
                contact: { enabled: false, path: '/legal/contact' }
            }))
        ),
        useStorefrontContent: vi.fn(() =>
            computed(() => ({
                nav: { home: 'Home', shop: 'Shop', contact: 'Contact' },
                search: { placeholder: 'Search…' },
                header: { wishlistTitle: 'Wishlist', accountTitle: 'Account' },
                footer: {
                    contact: 'Contact',
                    contactUs: 'Contact us',
                    aboutUs: 'About us',
                    termsPrivacy: 'Terms & privacy',
                    termsOfService: 'Terms of service',
                    privacyPolicy: 'Privacy policy',
                    returnPolicy: 'Return policy',
                    help: 'Help',
                    faq: 'FAQ',
                    shippingInfo: 'Shipping info',
                    copyright: () => ''
                }
            }))
        )
    }
})

describe('ModernStoreShell', () => {
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
            components: { ModernStoreShell },
            template: '<Suspense><ModernStoreShell /></Suspense>'
        })

        const wrapper = mount(SuspenseWrapper, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    Icon: true,
                    LocaleSwitcher: true,
                    StorefrontSharedAnnouncementBar: { template: '<div>Welcome to our store!</div>' },
                    StoreThemeProvider: { template: '<div><slot /></div>' }
                }
            }
        })

        return flushPromises().then(() => {
            expect(wrapper.find('header').exists()).toBe(true)
            // Announcement bar should render default text
            expect(wrapper.text()).toContain('Welcome to our store!')
        })
    })

    it('hides header and announcement bar when hideNavigation prop is true', () => {
        const SuspenseWrapper = defineComponent({
            components: { ModernStoreShell },
            template: '<Suspense><ModernStoreShell :hideNavigation="true" /></Suspense>'
        })

        const wrapper = mount(SuspenseWrapper, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    Icon: true,
                    LocaleSwitcher: true,
                    StorefrontSharedAnnouncementBar: { template: '<div>Welcome to our store!</div>' },
                    StoreThemeProvider: { template: '<div><slot /></div>' }
                }
            }
        })

        return flushPromises().then(() => {
            expect(wrapper.find('header').exists()).toBe(false)
            expect(wrapper.text()).not.toContain('Welcome to our store!')
        })
    })
})
