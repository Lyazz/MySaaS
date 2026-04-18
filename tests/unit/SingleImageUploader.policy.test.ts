import { computed } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SingleImageUploader from '../../components/admin/SingleImageUploader.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: computed(() => 'en')
  })
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ token: 'test-token' })
}))

describe('SingleImageUploader policy wiring', () => {
  it('logo mode allows free ratio (no forced square)', () => {
    const wrapper = mount(SingleImageUploader, {
      props: {
        modelValue: null,
        mode: 'logo',
        label: 'Logo'
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
    expect(modal.props('cropPresets')).toContain('free')
    expect(modal.props('defaultPreset')).toBe('free')
  })

  it('favicon mode forces square crop preset', () => {
    const wrapper = mount(SingleImageUploader, {
      props: {
        modelValue: null,
        mode: 'favicon',
        label: 'Favicon'
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
    expect(modal.props('cropPresets')).toEqual(['1:1'])
    expect(modal.props('defaultPreset')).toBe('1:1')
  })
})
