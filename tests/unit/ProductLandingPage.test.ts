import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductLandingPage from '../../components/storefront/templates/modern/ProductLandingPage.vue'
import { createTestingPinia } from '@pinia/testing'

describe('ProductLandingPage', () => {
    const mockProduct = {
        id: 'prod_123',
        title: 'Test Product',
        slug: 'test-product',
        description: '<p>Visual description goes here.</p>',
        miniDescription: 'Short teaser.',
        price: 1500,
        stock: 10,
        isActive: true,
        images: ['img1.jpg']
    }

    it('renders landing page structure correctly', () => {
        const wrapper = mount(ProductLandingPage, {
            props: {
                product: mockProduct
            },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true
                }
            }
        })

        // Check for Title and Price
        expect(wrapper.text()).toContain('Test Product')
        expect(wrapper.text()).toContain('1,500.00 DZD')

        // Check for Description
        expect(wrapper.html()).toContain('Visual description goes here.')

        // Check for Order Form
        expect(wrapper.text()).toContain('Order Now')
        expect(wrapper.find('form').exists()).toBe(true)
        expect(wrapper.find('input[placeholder="0550 12 34 56"]').exists()).toBe(true)
    })

    it('renders description before the order form', () => {
        const wrapper = mount(ProductLandingPage, {
            props: { product: mockProduct },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: { NuxtLink: true }
            }
        })

        const html = wrapper.html()
        const descriptionIndex = html.indexOf('Visual description goes here.')
        const formIndex = html.indexOf('Order Now') // Heading of the form

        expect(descriptionIndex).not.toBe(-1)
        expect(formIndex).not.toBe(-1)
        expect(descriptionIndex).toBeLessThan(formIndex)
    })
})
