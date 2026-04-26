import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NavCinematic from '../../components/marketing/cinematic/NavCinematic.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    logout: vi.fn()
  })
}))

describe('NavCinematic logo rendering', () => {
  it('renders shared SaaS placeholder logo', () => {
    const wrapper = mount(NavCinematic, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>' },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    const image = wrapper.get('img[src="/swekly-logo-mark.svg"]')
    expect(image.exists()).toBe(true)
    expect(wrapper.text()).toContain('Swekly')
  })
})
