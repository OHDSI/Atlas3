/**
 * usePagination Composable Tests
 * Tests for pagination state management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useRoute: vi.fn(() => ({
    query: {},
  })),
}))

import { usePagination } from '@/composables/usePagination'
import { useRouter, useRoute } from 'vue-router'

describe('usePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mocks to default state
    vi.mocked(useRoute).mockReturnValue({
      query: {},
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    // Mock window.scrollTo
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const totalItems = ref(100)
      const pagination = usePagination(totalItems)

      expect(pagination.page.value).toBe(1)
      expect(pagination.itemsPerPage.value).toBe(60)
      expect(pagination.itemsPerPageOptions).toEqual([60, 120, 240])
    })

    it('should initialize from URL query params', () => {
      vi.mocked(useRoute).mockReturnValue({
        query: { page: '3', perPage: '120' },
      } as any)

      const totalItems = ref(500)
      const pagination = usePagination(totalItems)

      expect(pagination.page.value).toBe(3)
      expect(pagination.itemsPerPage.value).toBe(120)
    })

    it('should accept custom options', () => {
      const totalItems = ref(100)
      const pagination = usePagination(totalItems, {
        defaultItemsPerPage: 25,
        itemsPerPageOptions: [25, 50, 100],
      })

      expect(pagination.itemsPerPage.value).toBe(25)
      expect(pagination.itemsPerPageOptions).toEqual([25, 50, 100])
    })
  })

  describe('computed values', () => {
    it('should calculate totalPages correctly', () => {
      const totalItems = ref(250)
      const pagination = usePagination(totalItems)

      expect(pagination.totalPages.value).toBe(5) // 250 / 60 = 4.17 -> ceil = 5
    })

    it('should update totalPages when itemsPerPage changes', () => {
      const totalItems = ref(250)
      const pagination = usePagination(totalItems)

      pagination.setItemsPerPage(120)
      expect(pagination.totalPages.value).toBe(3) // 250 / 120 = 2.08 -> ceil = 3
    })

    it('should correctly determine canGoPrevious', () => {
      const totalItems = ref(100)
      const pagination = usePagination(totalItems)

      expect(pagination.canGoPrevious.value).toBe(false) // page 1

      pagination.setPage(2)
      expect(pagination.canGoPrevious.value).toBe(true)
    })

    it('should correctly determine canGoNext', () => {
      const totalItems = ref(100)
      const pagination = usePagination(totalItems)

      expect(pagination.canGoNext.value).toBe(true) // 2 pages total

      pagination.setPage(2)
      expect(pagination.canGoNext.value).toBe(false)
    })

    it('should format rangeDisplay correctly', () => {
      const totalItems = ref(250)
      const pagination = usePagination(totalItems)

      expect(pagination.rangeDisplay.value).toBe('1-60 of 250')

      pagination.setPage(2)
      expect(pagination.rangeDisplay.value).toBe('61-120 of 250')

      pagination.setPage(5)
      expect(pagination.rangeDisplay.value).toBe('241-250 of 250')
    })

    it('should handle empty results in rangeDisplay', () => {
      const totalItems = ref(0)
      const pagination = usePagination(totalItems)

      expect(pagination.rangeDisplay.value).toBe('0-0 of 0')
    })
  })

  describe('navigation', () => {
    it('should navigate to next page', () => {
      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.nextPage()
      expect(pagination.page.value).toBe(2)
    })

    it('should not go past last page', () => {
      const totalItems = ref(100)
      const pagination = usePagination(totalItems)

      pagination.setPage(2) // Last page
      pagination.nextPage()
      expect(pagination.page.value).toBe(2)
    })

    it('should navigate to previous page', () => {
      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.setPage(3)
      pagination.previousPage()
      expect(pagination.page.value).toBe(2)
    })

    it('should not go before first page', () => {
      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.previousPage()
      expect(pagination.page.value).toBe(1)
    })

    it('should set page to valid range', () => {
      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.setPage(10) // Beyond total pages
      expect(pagination.page.value).toBeLessThanOrEqual(pagination.totalPages.value)

      pagination.setPage(0)
      expect(pagination.page.value).toBe(1)

      pagination.setPage(-5)
      expect(pagination.page.value).toBe(1)
    })
  })

  describe('items per page', () => {
    it('should change items per page and reset to page 1', () => {
      const totalItems = ref(500)
      const pagination = usePagination(totalItems)

      pagination.setPage(3)
      expect(pagination.page.value).toBe(3)

      pagination.setItemsPerPage(120)
      expect(pagination.itemsPerPage.value).toBe(120)
      expect(pagination.page.value).toBe(1)
    })
  })

  describe('URL synchronization', () => {
    it('should update URL when page changes', () => {
      const mockPush = vi.fn()
      vi.mocked(useRouter).mockReturnValue({
        push: mockPush,
      } as any)

      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.setPage(2)

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            page: '2',
          }),
        })
      )
    })

    it('should update URL when items per page changes', () => {
      const mockPush = vi.fn()
      vi.mocked(useRouter).mockReturnValue({
        push: mockPush,
      } as any)

      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.setItemsPerPage(120)

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            perPage: '120',
          }),
        })
      )
    })
  })

  describe('scroll behavior', () => {
    it('should scroll to top when page changes', () => {
      const totalItems = ref(200)
      const pagination = usePagination(totalItems)

      pagination.setPage(2)

      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })
  })
})
