import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductImagesUploader from '../../components/admin/ProductImagesUploader.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: computed(() => 'en')
  })
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ token: 'test-token' })
}))

describe('ProductImagesUploader policy behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes default product crop presets with free mode', () => {
    const wrapper = mount(ProductImagesUploader, {
      props: {
        modelValue: []
      },
      global: {
        stubs: {
          Icon: true,
          ImageCropperModal: {
            name: 'ImageCropperModal',
            template: '<div data-testid="cropper-modal" />',
            props: ['open', 'file', 'cropPresets', 'defaultPreset']
          }
        }
      }
    })

    const modal = wrapper.getComponent({ name: 'ImageCropperModal' })
    expect(modal.props('defaultPreset')).toBe('free')
    expect(modal.props('cropPresets')).toContain('free')
  })

  it('rejects files larger than 5MB before upload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = mount(ProductImagesUploader, {
      props: {
        modelValue: []
      },
      global: {
        stubs: {
          Icon: true,
          ImageCropperModal: {
            name: 'ImageCropperModal',
            template: '<div data-testid="cropper-modal" />',
            props: ['open', 'file', 'cropPresets', 'defaultPreset']
          }
        }
      }
    })

    const input = wrapper.get('input[type="file"]')
    const oversizedFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', {
      value: [oversizedFile],
      writable: false
    })

    await input.trigger('change')

    expect(alertSpy).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
