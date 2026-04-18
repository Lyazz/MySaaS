import { describe, expect, it } from 'vitest'
import { resolveImageUploadPolicy } from '../../shared/image-upload/policies'

describe('image upload policies', () => {
  it('logo mode keeps free ratio and does not require square', () => {
    const policy = resolveImageUploadPolicy({ mode: 'logo' })

    expect(policy.requireSquare).toBe(false)
    expect(policy.defaultPreset).toBe('free')
    expect(policy.cropPresets).toContain('free')
  })

  it('favicon mode enforces square preset', () => {
    const policy = resolveImageUploadPolicy({ mode: 'favicon' })

    expect(policy.requireSquare).toBe(true)
    expect(policy.defaultPreset).toBe('1:1')
    expect(policy.cropPresets).toEqual(['1:1'])
  })

  it('product mode defaults to 4:5 and max 5MB while exposing free mode', () => {
    const policy = resolveImageUploadPolicy({ mode: 'product' })

    expect(policy.defaultPreset).toBe('4:5')
    expect(policy.maxFileSizeMb).toBe(5)
    expect(policy.cropPresets).toContain('free')
  })
})
