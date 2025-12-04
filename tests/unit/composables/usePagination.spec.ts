/**
 * Unit Tests: usePagination Composable
 * Tests for src/composables/usePagination.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

// Mock vue-router
const mockPush = vi.fn()
const mockQuery = ref<Record<string, string>>({})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({
    query: mockQuery.value,
  }),
}))

// Mock window.scrollTo
vi.stubGlobal('scrollTo', vi.fn())

import { usePagination } from '@/composables/usePagination'

describe('usePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.value = {}
  })

  describe('initialization', () => {
    it('initializes with default values', () => {
      const totalItems = ref(100)
      const { page, itemsPerPage, itemsPerPageOptions } = usePagination(totalItems)

      expect(page.value).toBe(1)
      expect(itemsPerPage.value).toBe(60)
      expect(itemsPerPageOptions).toEqual([60, 120, 240])
    })

    it('initializes from URL query params', () => {
      mockQuery.value = { page: '3', perPage: '120' }
      const totalItems = ref(500)
      const { page, itemsPerPage } = usePagination(totalItems)

      expect(page.value).toBe(3)
      expect(itemsPerPage.value).toBe(120)
    })

    it('uses custom options', () => {
      const totalItems = ref(100)
      const { itemsPerPage, itemsPerPageOptions } = usePagination(totalItems, {
        defaultItemsPerPage: 25,
        itemsPerPageOptions: [25, 50, 100],
      })

      expect(itemsPerPage.value).toBe(25)
      expect(itemsPerPageOptions).toEqual([25, 50, 100])
    })
  })

  describe('computed properties', () => {
    it('calculates totalPages correctly', () => {
      const totalItems = ref(250)
      const { totalPages, itemsPerPage } = usePagination(totalItems)

      expect(totalPages.value).toBe(5) // 250 / 60 = 4.16, ceil = 5

      itemsPerPage.value = 120
      expect(totalPages.value).toBe(3) // 250 / 120 = 2.08, ceil = 3
    })

    it('calculates canGoPrevious correctly', () => {
      const totalItems = ref(200)
      const { canGoPrevious, page } = usePagination(totalItems)

      expect(canGoPrevious.value).toBe(false) // Page 1

      page.value = 2
      expect(canGoPrevious.value).toBe(true)
    })

    it('calculates canGoNext correctly', () => {
      const totalItems = ref(120)
      const { canGoNext, page, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 60
      expect(canGoNext.value).toBe(true) // 2 pages, on page 1

      page.value = 2
      expect(canGoNext.value).toBe(false) // On last page
    })

    it('generates correct rangeDisplay', () => {
      const totalItems = ref(100)
      const { rangeDisplay, page, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 25
      expect(rangeDisplay.value).toBe('1-25 of 100')

      page.value = 2
      expect(rangeDisplay.value).toBe('26-50 of 100')

      page.value = 4
      expect(rangeDisplay.value).toBe('76-100 of 100')
    })

    it('handles empty results in rangeDisplay', () => {
      const totalItems = ref(0)
      const { rangeDisplay } = usePagination(totalItems)

      expect(rangeDisplay.value).toBe('0-0 of 0')
    })

    it('handles partial last page in rangeDisplay', () => {
      const totalItems = ref(85)
      const { rangeDisplay, page, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 25
      page.value = 4
      expect(rangeDisplay.value).toBe('76-85 of 85')
    })
  })

  describe('navigation methods', () => {
    it('nextPage increments page', () => {
      const totalItems = ref(200)
      const { page, nextPage } = usePagination(totalItems)

      expect(page.value).toBe(1)
      nextPage()
      expect(page.value).toBe(2)
    })

    it('nextPage does nothing on last page', () => {
      const totalItems = ref(50)
      const { page, nextPage, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 60
      expect(page.value).toBe(1)
      nextPage()
      expect(page.value).toBe(1) // Only 1 page total
    })

    it('previousPage decrements page', () => {
      mockQuery.value = { page: '3' }
      const totalItems = ref(200)
      const { page, previousPage } = usePagination(totalItems)

      expect(page.value).toBe(3)
      previousPage()
      expect(page.value).toBe(2)
    })

    it('previousPage does nothing on first page', () => {
      const totalItems = ref(200)
      const { page, previousPage } = usePagination(totalItems)

      expect(page.value).toBe(1)
      previousPage()
      expect(page.value).toBe(1)
    })

    it('setPage validates page bounds', () => {
      const totalItems = ref(100)
      const { page, setPage, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 25 // 4 pages total

      setPage(0)
      expect(page.value).toBe(1) // Minimum is 1

      setPage(10)
      expect(page.value).toBe(4) // Maximum is totalPages

      setPage(3)
      expect(page.value).toBe(3)
    })

    it('setPage updates URL', () => {
      const totalItems = ref(200)
      const { setPage } = usePagination(totalItems)

      setPage(2)
      expect(mockPush).toHaveBeenCalledWith({
        query: expect.objectContaining({ page: '2' }),
      })
    })

    it('setPage scrolls to top', () => {
      const totalItems = ref(200)
      const { setPage } = usePagination(totalItems)

      setPage(2)
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })
  })

  describe('setItemsPerPage', () => {
    it('changes items per page and resets to page 1', () => {
      mockQuery.value = { page: '3' }
      const totalItems = ref(500)
      const { page, itemsPerPage, setItemsPerPage } = usePagination(totalItems)

      expect(page.value).toBe(3)
      setItemsPerPage(120)

      expect(itemsPerPage.value).toBe(120)
      expect(page.value).toBe(1)
    })

    it('updates URL with new perPage', () => {
      const totalItems = ref(200)
      const { setItemsPerPage } = usePagination(totalItems)

      setItemsPerPage(120)
      expect(mockPush).toHaveBeenCalledWith({
        query: expect.objectContaining({ perPage: '120' }),
      })
    })
  })

  describe('totalItems watcher', () => {
    it('resets to page 1 when current page exceeds new total', async () => {
      const totalItems = ref(500)
      const { page, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 100
      page.value = 5 // 5 pages total

      // Reduce total items so there are only 2 pages
      totalItems.value = 150
      await nextTick()

      expect(page.value).toBe(1)
    })

    it('keeps current page when within bounds', async () => {
      const totalItems = ref(500)
      const { page, itemsPerPage } = usePagination(totalItems)

      itemsPerPage.value = 100
      page.value = 2

      // Reduce total items but keep 2+ pages
      totalItems.value = 250
      await nextTick()

      expect(page.value).toBe(2)
    })
  })
})
