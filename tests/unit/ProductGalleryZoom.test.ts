import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ModernProductGallery from '../../components/storefront/templates/modern/partials/ProductGallery.vue'
import CozyProductGallery from '../../components/storefront/templates/cozy/partials/ProductGallery.vue'

describe('Product gallery zoom behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
  })

  it('modern gallery uses contain-fit and updates zoom on mouse move', async () => {
    const wrapper = mount(ModernProductGallery, {
      props: {
        images: ['/a.jpg'],
        title: 'Test Product'
      },
      global: {
        stubs: {
          Icon: true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    })

    const mainFrame = wrapper.find('.cursor-zoom-in')
    expect(mainFrame.exists()).toBe(true)

    const mainImage = wrapper.find('img[alt="Test Product"]')
    expect(mainImage.exists()).toBe(true)
    expect(mainImage.classes()).toContain('object-contain')
    expect(mainImage.classes()).not.toContain('object-cover')

    const rect = { left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    ;(mainFrame.element as HTMLElement).getBoundingClientRect = () => rect

    await mainFrame.trigger('mousemove', { clientX: 100, clientY: 200 })
    expect(mainImage.attributes('style') || '').toContain('transform-origin: 50% 50%')
    expect(mainImage.attributes('style') || '').toContain('transform: scale(1.8)')

    await mainFrame.trigger('mouseleave')
    expect(mainImage.attributes('style') || '').toContain('transform: scale(1)')
  })

  it('cozy gallery uses contain-fit and updates zoom on mouse move', async () => {
    const wrapper = mount(CozyProductGallery, {
      props: {
        images: ['/b.jpg'],
        title: 'Cozy Product'
      },
      global: {
        stubs: {
          Icon: true
        }
      }
    })

    const mainFrame = wrapper.find('.cursor-zoom-in')
    expect(mainFrame.exists()).toBe(true)

    const mainImage = wrapper.find('img[alt="Cozy Product"]')
    expect(mainImage.exists()).toBe(true)
    expect(mainImage.classes()).toContain('object-contain')
    expect(mainImage.classes()).not.toContain('object-cover')

    const rect = { left: 20, top: 20, width: 100, height: 200, right: 120, bottom: 220, x: 20, y: 20, toJSON: () => ({}) } as DOMRect
    ;(mainFrame.element as HTMLElement).getBoundingClientRect = () => rect

    await mainFrame.trigger('mousemove', { clientX: 70, clientY: 70 })
    expect(mainImage.attributes('style') || '').toContain('transform-origin: 50% 25%')
    expect(mainImage.attributes('style') || '').toContain('transform: scale(1.8)')

    await mainFrame.trigger('mouseleave')
    expect(mainImage.attributes('style') || '').toContain('transform-origin: 50% 50%')
    expect(mainImage.attributes('style') || '').toContain('transform: scale(1)')
  })
})
