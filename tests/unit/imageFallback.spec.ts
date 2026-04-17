// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { installImageErrorFallback } from '../../utils/imageFallback'

const isUnavailablePlaceholder = (src: string) => src.toLowerCase().startsWith('https://placehold.co/')

describe('installImageErrorFallback', () => {
  it('replaces placehold.co placeholders immediately', () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    img.setAttribute('src', 'https://placehold.co/600x400')
    root.appendChild(img)
    document.body.appendChild(root)

    const cleanup = installImageErrorFallback({
      root,
      fallbackSrc: '/blank.svg?v=2',
      treatSrcAsUnavailable: isUnavailablePlaceholder
    })

    expect(img.getAttribute('src')).toBe('/blank.svg?v=2')
    cleanup()
  })

  it('replaces missing src to avoid broken icon', () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    root.appendChild(img)
    document.body.appendChild(root)

    const cleanup = installImageErrorFallback({
      root,
      fallbackSrc: '/blank.svg?v=2'
    })

    expect(img.getAttribute('src')).toBe('/blank.svg?v=2')
    cleanup()
  })

  it('replaces src on error event', () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    img.setAttribute('src', 'https://example.com/404.png')
    root.appendChild(img)
    document.body.appendChild(root)

    const cleanup = installImageErrorFallback({
      root,
      fallbackSrc: '/blank.svg?v=2'
    })

    img.dispatchEvent(new Event('error'))
    expect(img.getAttribute('src')).toBe('/blank.svg?v=2')
    cleanup()
  })

  it('handles src changes to placeholders (MutationObserver)', async () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    img.setAttribute('src', 'https://example.com/ok.png')
    root.appendChild(img)
    document.body.appendChild(root)

    const cleanup = installImageErrorFallback({
      root,
      fallbackSrc: '/blank.svg?v=2',
      treatSrcAsUnavailable: isUnavailablePlaceholder
    })

    img.setAttribute('src', 'https://placehold.co/100x100')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(img.getAttribute('src')).toBe('/blank.svg?v=2')
    cleanup()
  })
})
