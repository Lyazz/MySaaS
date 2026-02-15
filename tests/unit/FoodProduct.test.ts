import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FoodProduct from '../../components/storefront/templates/food/Product.vue'
import ProductOrderForm from '../../components/storefront/templates/food/partials/ProductOrderForm.vue'
import ProductDetails from '../../components/storefront/templates/food/partials/ProductDetails.vue'
import ProductGallery from '../../components/storefront/templates/food/partials/ProductGallery.vue'
import { createTestingPinia } from '@pinia/testing'
import { useState } from '#imports'
import { computed } from 'vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: computed(() => 'en')
    })
}))

describe('FoodProduct', () => {
    const mockProduct = {
        id: 'prod_123',
        title: 'Test Product',
        slug: 'test-product',
        description: 'This is a test product',
        price: 1500,
        stock: 10,
        isActive: true,
        images: ['img1.jpg', 'img2.jpg'],
        options: []
    }

    beforeEach(() => {
        const storeSettings = useState<any>('storeSettings')
        storeSettings.value = undefined
    })

    it('renders product structure with correct child components', () => {
        const wrapper = mount(FoodProduct, {
            props: {
                product: mockProduct
            },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    ProductGallery: true,
                    ProductDetails: true,
                    ProductOrderForm: true
                }
            }
        })

        // Check if Child Components are rendered
        expect(wrapper.findComponent(ProductGallery).exists()).toBe(true)
        expect(wrapper.findComponent(ProductDetails).exists()).toBe(true)
        expect(wrapper.findComponent(ProductOrderForm).exists()).toBe(true)
    })

    it('passes correct props to child components', () => {
        const wrapper = mount(FoodProduct, {
            props: { product: mockProduct },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: {
                    NuxtLink: true,
                    ProductGallery: true,
                    ProductDetails: true,
                    ProductOrderForm: true
                }
            }
        })

        // Check ProductGallery props
        const gallery = wrapper.findComponent(ProductGallery)
        expect(gallery.props('images')).toEqual(['img1.jpg', 'img2.jpg'])
        expect(gallery.props('title')).toBe('Test Product')

        // Check ProductDetails props
        const details = wrapper.findComponent(ProductDetails)
        expect(details.props('product')).toEqual(mockProduct)
        expect(details.props('currentPrice')).toBe(1500)

        // Check ProductOrderForm props
        const orderForm = wrapper.findComponent(ProductOrderForm)
        expect(orderForm.props('product')).toEqual(mockProduct)
        expect(orderForm.props('currentPrice')).toBe(1500)
    })

    it('renders description content', () => {
        const wrapper = mount(FoodProduct, {
            props: { product: mockProduct },
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: { NuxtLink: true, ProductGallery: true, ProductDetails: true, ProductOrderForm: true }
            }
        })

        expect(wrapper.html()).toContain('This is a test product')
    })
})
