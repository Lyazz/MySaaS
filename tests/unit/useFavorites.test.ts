import { describe, it, expect, beforeEach } from 'vitest'
import { useState } from '#imports'

describe('useFavorites', () => {
  const storageKey = 'mysaas:favorites:v1'

  beforeEach(async () => {
    ;(process as any).client = true
    localStorage.removeItem(storageKey)

    useState<any>('tenant', () => null).value = { id: 't_1', slug: 'tenant-1' }
    useState<Record<string, string[]>>('favorites:storage:v1', () => ({})).value = {}
    useState<boolean>('favorites:hydrated', () => false).value = false
  })

  it('adds and removes product ids and persists to localStorage', async () => {
    const { useFavorites } = await import('../../composables/useFavorites')
    const favorites = useFavorites()

    favorites.add('p_1')
    expect(favorites.isFavorite('p_1')).toBe(true)
    expect(favorites.count.value).toBe(1)

    const persisted = JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, string[]>
    expect(persisted.t_1).toEqual(['p_1'])

    favorites.remove('p_1')
    expect(favorites.isFavorite('p_1')).toBe(false)
    expect(favorites.count.value).toBe(0)
  })

  it('isolates favorites by tenant id', async () => {
    const { useFavorites } = await import('../../composables/useFavorites')
    const tenant = useState<any>('tenant', () => null)

    tenant.value = { id: 'tenant_a', slug: 'a' }
    useFavorites().add('p_a')

    tenant.value = { id: 'tenant_b', slug: 'b' }
    useFavorites().add('p_b')

    tenant.value = { id: 'tenant_a', slug: 'a' }
    expect(useFavorites().isFavorite('p_a')).toBe(true)
    expect(useFavorites().isFavorite('p_b')).toBe(false)
  })
})

