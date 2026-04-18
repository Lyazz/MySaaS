export const useProductPagination = (items: { value: any[] }, perPage = 12) => {
  const currentPage = ref(1)

  const totalPages = computed(() => {
    const total = Math.ceil(items.value.length / perPage)
    return total > 0 ? total : 1
  })

  const pageNumbers = computed(() =>
    Array.from({ length: totalPages.value }, (_, index) => index + 1)
  )

  const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * perPage
    return items.value.slice(start, start + perPage)
  })

  const canGoPrev = computed(() => currentPage.value > 1)
  const canGoNext = computed(() => currentPage.value < totalPages.value)

  const goToPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(totalPages.value, page))
    currentPage.value = nextPage
  }

  const goToPrevPage = () => {
    if (!canGoPrev.value) return
    goToPage(currentPage.value - 1)
  }

  const goToNextPage = () => {
    if (!canGoNext.value) return
    goToPage(currentPage.value + 1)
  }

  watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages) {
      currentPage.value = nextTotalPages
    }
  })

  return {
    currentPage,
    totalPages,
    pageNumbers,
    paginatedProducts,
    canGoPrev,
    canGoNext,
    goToPage,
    goToPrevPage,
    goToNextPage
  }
}
