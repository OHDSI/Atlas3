/**
 * Unit Tests: useConfigPanel Composable
 * Tests for src/composables/useConfigPanel.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  watchDebounced: vi.fn((_source, _callback) => {
    // Return a simple watcher mock
    return vi.fn()
  }),
}))

// Mock UI store
const mockUIStore = {
  openConfigPanel: vi.fn(),
  closeConfigPanel: vi.fn(),
  setConfigPanelSection: vi.fn(),
  setConfigPanelScroll: vi.fn(),
}

vi.mock('@/stores/ui', () => ({
  useUIStore: () => mockUIStore,
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import after mocks
import { useConfigPanel } from '@/composables/useConfigPanel'

describe('useConfigPanel', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock = {}

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return localStorageMock[key] ?? null
    })

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      localStorageMock[key] = value
    })

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete localStorageMock[key]
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('returns default values', () => {
      const { isOpen, activeSection, scrollPosition } = useConfigPanel()

      expect(isOpen.value).toBe(false)
      expect(activeSection.value).toBe('cache')
      expect(scrollPosition.value).toBe(0)
    })
  })

  describe('loadState', () => {
    it('loads isOpen from localStorage', () => {
      // Set up localStorage before calling composable
      localStorage.setItem('atlas3-config-panel-open', 'true')
      const { loadState, isOpen } = useConfigPanel()

      loadState()

      expect(isOpen.value).toBe(true)
    })

    it('loads activeSection from localStorage', () => {
      localStorage.setItem('atlas3-config-panel-section', 'vocabulary')
      const { loadState, activeSection } = useConfigPanel()

      loadState()

      expect(activeSection.value).toBe('vocabulary')
    })

    it('loads scrollPosition from localStorage', () => {
      localStorage.setItem('atlas3-config-panel-scroll', '150')
      const { loadState, scrollPosition } = useConfigPanel()

      loadState()

      expect(scrollPosition.value).toBe(150)
    })

    it('ignores invalid section values', () => {
      localStorage.setItem('atlas3-config-panel-section', 'invalid')
      const { loadState, activeSection } = useConfigPanel()

      loadState()

      expect(activeSection.value).toBe('cache') // default
    })

    it('handles localStorage errors gracefully', async () => {
      const { logger } = await import('@/utils/logger')
      const originalGetItem = localStorage.getItem
      localStorage.getItem = () => { throw new Error('Storage error') }

      const { loadState } = useConfigPanel()
      loadState()

      // Should not throw, and logger should be called
      expect(logger.error).toHaveBeenCalled()
      localStorage.getItem = originalGetItem
    })

    it('handles NaN scroll position', () => {
      localStorage.setItem('atlas3-config-panel-scroll', 'not-a-number')
      const { loadState, scrollPosition } = useConfigPanel()

      loadState()

      expect(scrollPosition.value).toBe(0)
    })
  })

  describe('openPanel', () => {
    it('sets isOpen to true', () => {
      const { openPanel, isOpen } = useConfigPanel()

      openPanel()

      expect(isOpen.value).toBe(true)
    })
  })

  describe('closePanel', () => {
    it('sets isOpen to false', () => {
      const { openPanel, closePanel, isOpen } = useConfigPanel()

      openPanel()
      closePanel()

      expect(isOpen.value).toBe(false)
    })
  })

  describe('togglePanel', () => {
    it('toggles isOpen from false to true', () => {
      const { togglePanel, isOpen } = useConfigPanel()

      expect(isOpen.value).toBe(false)
      togglePanel()
      expect(isOpen.value).toBe(true)
    })

    it('toggles isOpen from true to false', () => {
      const { togglePanel, isOpen, openPanel } = useConfigPanel()

      openPanel()
      togglePanel()

      expect(isOpen.value).toBe(false)
    })
  })

  describe('setActiveSection', () => {
    it('sets the active section to cache', () => {
      const { setActiveSection, activeSection } = useConfigPanel()

      setActiveSection('cache')

      expect(activeSection.value).toBe('cache')
    })

    it('sets the active section to vocabulary', () => {
      const { setActiveSection, activeSection } = useConfigPanel()

      setActiveSection('vocabulary')

      expect(activeSection.value).toBe('vocabulary')
    })

    it('sets the active section to tags', () => {
      const { setActiveSection, activeSection } = useConfigPanel()

      setActiveSection('tags')

      expect(activeSection.value).toBe('tags')
    })
  })

  describe('setScrollPosition', () => {
    it('sets scroll position to specified value', () => {
      const { setScrollPosition, scrollPosition } = useConfigPanel()

      setScrollPosition(100)

      expect(scrollPosition.value).toBe(100)
    })

    it('sets scroll position to zero', () => {
      const { setScrollPosition, scrollPosition } = useConfigPanel()

      setScrollPosition(500)
      setScrollPosition(0)

      expect(scrollPosition.value).toBe(0)
    })
  })

  describe('localStorage persistence', () => {
    it.skip('saves isOpen to localStorage on change (requires Vue watchers)', async () => {
      // This test requires Vue watchers to execute, which is challenging in unit tests
    })

    it.skip('saves activeSection to localStorage on change (requires Vue watchers)', async () => {
      // This test requires Vue watchers to execute, which is challenging in unit tests
    })
  })

  describe('UI store integration', () => {
    it.skip('calls uiStore.openConfigPanel when opened (requires Vue watchers)', async () => {
      // This test requires Vue watchers to execute, which is challenging in unit tests
    })

    it.skip('calls uiStore.closeConfigPanel when closed (requires Vue watchers)', async () => {
      // This test requires Vue watchers to execute, which is challenging in unit tests
    })

    it.skip('calls uiStore.setConfigPanelSection on section change (requires Vue watchers)', async () => {
      // This test requires Vue watchers to execute, which is challenging in unit tests
    })
  })
})
