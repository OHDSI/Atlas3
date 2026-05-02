/**
 * usePagination Composable
 * Manages pagination state and URL query parameter synchronization
 */
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Ref } from 'vue'

interface UsePaginationOptions {
  defaultItemsPerPage?: number
  itemsPerPageOptions?: number[]
}

export function usePagination(totalItems: Ref<number>, options: UsePaginationOptions = {}) {
  const { defaultItemsPerPage = 60, itemsPerPageOptions = [60, 120, 240] } = options

  const router = useRouter()
  const route = useRoute()

  // Initialize from URL query params or defaults
  const page = ref(parseInt(route.query.page as string) || 1)
  const itemsPerPage = ref(parseInt(route.query.perPage as string) || defaultItemsPerPage)

  /**
   * Total number of pages
   */
  const totalPages = computed(() => {
    return Math.ceil(totalItems.value / itemsPerPage.value)
  })

  /**
   * Can navigate to previous page
   */
  const canGoPrevious = computed(() => {
    return page.value > 1
  })

  /**
   * Can navigate to next page
   */
  const canGoNext = computed(() => {
    return page.value < totalPages.value
  })

  /**
   * Range display (e.g., "1-10 of 20547")
   */
  const rangeDisplay = computed(() => {
    if (totalItems.value === 0) {
      return '0-0 of 0'
    }

    const start = (page.value - 1) * itemsPerPage.value + 1
    const end = Math.min(page.value * itemsPerPage.value, totalItems.value)
    return `${start}-${end} of ${totalItems.value}`
  })

  /**
   * Navigate to next page
   */
  function nextPage() {
    if (canGoNext.value) {
      setPage(page.value + 1)
    }
  }

  /**
   * Navigate to previous page
   */
  function previousPage() {
    if (canGoPrevious.value) {
      setPage(page.value - 1)
    }
  }

  /**
   * Set specific page number
   */
  function setPage(newPage: number) {
    const validPage = Math.max(1, Math.min(newPage, totalPages.value))
    page.value = validPage
    updateURL()
    scrollToTop()
  }

  /**
   * Set items per page
   * Resets to page 1 when changed
   */
  function setItemsPerPage(value: number) {
    itemsPerPage.value = value
    page.value = 1
    updateURL()
    scrollToTop()
  }

  /**
   * Update URL query parameters
   */
  function updateURL() {
    router.push({
      query: {
        ...route.query,
        page: page.value.toString(),
        perPage: itemsPerPage.value.toString(),
      },
    })
  }

  /**
   * Scroll to top of page
   */
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Reset pagination when total items changes significantly
   * (e.g., search filters results)
   */
  watch(totalItems, newTotal => {
    // If current page is beyond new total pages, reset to page 1
    const newTotalPages = Math.ceil(newTotal / itemsPerPage.value)
    if (page.value > newTotalPages && newTotalPages > 0) {
      page.value = 1
      updateURL()
    }
  })

  /**
   * Watch for external route changes (browser back/forward)
   */
  watch(
    () => route.query,
    newQuery => {
      const newPage = parseInt(newQuery.page as string) || 1
      const newPerPage = parseInt(newQuery.perPage as string) || defaultItemsPerPage

      if (newPage !== page.value) {
        page.value = newPage
      }

      if (newPerPage !== itemsPerPage.value) {
        itemsPerPage.value = newPerPage
      }
    }
  )

  return {
    // State
    page,
    itemsPerPage,
    itemsPerPageOptions,

    // Computed
    totalPages,
    totalItems,
    canGoPrevious,
    canGoNext,
    rangeDisplay,

    // Actions
    nextPage,
    previousPage,
    setPage,
    setItemsPerPage,
  }
}
