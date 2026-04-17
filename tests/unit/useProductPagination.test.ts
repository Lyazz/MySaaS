import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useProductPagination } from '../../composables/useProductPagination'

describe('useProductPagination', () => {
  it('paginates items and navigates between pages', () => {
    const items = ref(Array.from({ length: 25 }, (_, index) => ({ id: index + 1 })))
    const pagination = useProductPagination(items, 10)

    expect(pagination.totalPages.value).toBe(3)
    expect(pagination.pageNumbers.value).toEqual([1, 2, 3])
    expect(pagination.paginatedProducts.value).toHaveLength(10)
    expect(pagination.paginatedProducts.value[0]?.id).toBe(1)

    pagination.goToNextPage()
    expect(pagination.currentPage.value).toBe(2)
    expect(pagination.paginatedProducts.value[0]?.id).toBe(11)

    pagination.goToPage(3)
    expect(pagination.currentPage.value).toBe(3)
    expect(pagination.paginatedProducts.value).toHaveLength(5)
    expect(pagination.canGoNext.value).toBe(false)
  })

  it('resets page when source items change', async () => {
    const items = ref(Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })))
    const pagination = useProductPagination(items, 5)

    pagination.goToPage(4)
    expect(pagination.currentPage.value).toBe(4)

    items.value = items.value.slice(0, 6)
    await nextTick()

    expect(pagination.currentPage.value).toBe(1)
    expect(pagination.totalPages.value).toBe(2)
    expect(pagination.paginatedProducts.value).toHaveLength(5)
  })
})
