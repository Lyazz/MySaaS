import { computed } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdminGettingStartedChecklist from '../../components/admin/AdminGettingStartedChecklist.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: computed(() => 'fr')
  })
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ token: 'test-token' })
}))

describe('AdminGettingStartedChecklist', () => {
  const completedChecklist = {
    hasLogo: true,
    hasProducts: true,
    hasCategories: true,
    hasDelivery: true,
    isPublished: true,
    checklistDismissed: false
  }

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn((url: string, options?: { method?: string }) => {
      if (url === '/api/admin/store-settings/onboarding-checklist') {
        return Promise.resolve(completedChecklist)
      }

      if (url === '/api/admin/store-settings' && options?.method === 'PATCH') {
        return Promise.resolve({})
      }

      return Promise.resolve({})
    })

    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps a dismiss button available when all checklist items are completed', async () => {
    const wrapper = mount(AdminGettingStartedChecklist, {
      global: {
        stubs: {
          Icon: true,
          NuxtLink: true
        }
      }
    })

    await flushPromises()

    const dismissButton = wrapper.get('[data-testid="getting-started-dismiss"]')
    expect(dismissButton.exists()).toBe(true)

    await dismissButton.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/store-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: { checklistDismissed: true }
      })
    )
    expect(wrapper.find('[data-testid="getting-started-dismiss"]').exists()).toBe(false)
  })
})
