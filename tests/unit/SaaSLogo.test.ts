import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaaSLogo from '../../components/branding/SaaSLogo.vue'

describe('SaaSLogo', () => {
  it('renders icon svg and wordmark with default props', () => {
    const wrapper = mount(SaaSLogo)

    const image = wrapper.get('[data-testid="saas-logo-image"]')
    const wordmark = wrapper.get('[data-testid="saas-logo-wordmark"]')
    expect(image.attributes('src')).toBe('/swekly-logo-mark.svg')
    expect(image.attributes('alt')).toBe('Swekly')
    expect(wordmark.text()).toBe('Swekly')
    expect(wrapper.get('[data-testid="saas-logo"]').attributes('data-size')).toBe('md')
    expect(wrapper.get('[data-testid="saas-logo"]').attributes('data-wordmark')).toBe('on')
  })

  it('supports icon-only rendering when showWordmark is false', () => {
    const wrapper = mount(SaaSLogo, {
      props: {
        showWordmark: false
      }
    })

    const root = wrapper.get('[data-testid="saas-logo"]')

    expect(root.attributes('data-wordmark')).toBe('off')
    expect(wrapper.find('[data-testid="saas-logo-wordmark"]').exists()).toBe(false)
  })

  it('applies size variant and custom alt text', () => {
    const wrapper = mount(SaaSLogo, {
      props: {
        size: 'lg',
        alt: 'Platform Logo'
      }
    })

    const root = wrapper.get('[data-testid="saas-logo"]')
    const image = wrapper.get('[data-testid="saas-logo-image"]')

    expect(root.attributes('data-size')).toBe('lg')
    expect(image.classes()).toContain('h-9')
    expect(image.attributes('alt')).toBe('Platform Logo')
  })
})
