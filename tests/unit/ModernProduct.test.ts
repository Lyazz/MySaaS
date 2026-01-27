import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModernProduct from '../../components/storefront/templates/modern/Product.vue'
import { createTestingPinia } from '@pinia/testing'

describe('ModernProduct', () => {
    const mockProduct = {
        id: 'prod_123',
        title: 'Test Product',
        slug: 'test-product',
        description: 'This is a test product',
        price: 1500,
        stock: 10,
        isActive: true,
        images: ['img1.jpg', 'img2.jpg']
    }

    it('renders product details correctly', () => {
        const wrapper = mount(ModernProduct, {
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

        expect(wrapper.text()).toContain('Test Product')
        expect(wrapper.text()).toContain('1,500.00 DZD')
        expect(wrapper.text()).toContain('This is a test product')
    })



    it('renders COD form fields', () => {
        const wrapper = mount(ModernProduct, {
            props: { product: mockProduct },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: { NuxtLink: true }
            }
        })

        expect(wrapper.find('input[placeholder="e.g. John Doe"]').exists()).toBe(true)
        expect(wrapper.find('input[placeholder="e.g. 0550 12 34 56"]').exists()).toBe(true)
        const buttons = wrapper.findAll('button')
        const orderBtn = buttons.find(b => b.text().includes('Confirm Order'))
        expect(orderBtn).toBeDefined()
        expect(orderBtn?.exists()).toBe(true)
    })
})
