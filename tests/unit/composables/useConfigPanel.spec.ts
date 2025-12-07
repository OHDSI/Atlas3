/**
 * useConfigPanel Composable Tests
 * Tests for configuration panel state with localStorage persistence
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  watchDebounced: vi.fn((_source, _callback, _options) => {
    // Immediately call callback for testing
    return vi.fn()
  }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useConfigPanel } from '@/composables/useConfigPanel'
import { useUIStore } from '@/stores/ui'

describe('useConfigPanel', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock localStorage
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('should have default closed state', () => {
      const { isOpen, activeSection, scrollPosition } = useConfigPanel()

      expect(isOpen.value).toBe(false)
      expect(activeSection.value).toBe('cache')
      expect(scrollPosition.value).toBe(0)
    })
  })

  describe('loadState', () => {
    it('should load open state from localStorage', () => {
      localStorageMock['atlas3-config-panel-open'] = 'true'

      const { isOpen, loadState } = useConfigPanel()
      loadState()

      expect(isOpen.value).toBe(true)
    })

    it('should load section from localStorage', () => {
      localStorageMock['atlas3-config-panel-section'] = 'vocabulary'

      const { activeSection, loadState } = useConfigPanel()
      loadState()

      expect(activeSection.value).toBe('vocabulary')
    })

    it('should load scroll position from localStorage', () => {
      localStorageMock['atlas3-config-panel-scroll'] = '150'

      const { scrollPosition, loadState } = useConfigPanel()
      loadState()

      expect(scrollPosition.value).toBe(150)
    })

    it('should ignore invalid section values', () => {
      localStorageMock['atlas3-config-panel-section'] = 'invalid'

      const { activeSection, loadState } = useConfigPanel()
      loadState()

      expect(activeSection.value).toBe('cache')
    })

    it('should handle invalid scroll position', () => {
      localStorageMock['atlas3-config-panel-scroll'] = 'not-a-number'

      const { scrollPosition, loadState } = useConfigPanel()
      loadState()

      expect(scrollPosition.value).toBe(0)
    })

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { loadState, isOpen } = useConfigPanel()

      // Should not throw
      expect(() => loadState()).not.toThrow()
      expect(isOpen.value).toBe(false)
    })
  })

  describe('panel actions', () => {
    it('should open panel', async () => {
      const { isOpen, openPanel } = useConfigPanel()

      openPanel()
      await nextTick()

      expect(isOpen.value).toBe(true)
      expect(localStorage.setItem).toHaveBeenCalledWith('atlas3-config-panel-open', 'true')
    })

    it('should close panel', async () => {
      const { isOpen, openPanel, closePanel } = useConfigPanel()
      openPanel()
      await nextTick()

      closePanel()
      await nextTick()

      expect(isOpen.value).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('atlas3-config-panel-open', 'false')
    })

    it('should toggle panel', async () => {
      const { isOpen, togglePanel } = useConfigPanel()

      togglePanel()
      await nextTick()
      expect(isOpen.value).toBe(true)

      togglePanel()
      await nextTick()
      expect(isOpen.value).toBe(false)
    })
  })

  describe('section navigation', () => {
    it('should set active section', async () => {
      const { activeSection, setActiveSection } = useConfigPanel()

      setActiveSection('vocabulary')
      await nextTick()

      expect(activeSection.value).toBe('vocabulary')
      expect(localStorage.setItem).toHaveBeenCalledWith('atlas3-config-panel-section', 'vocabulary')
    })

    it('should set tags section', async () => {
      const { activeSection, setActiveSection } = useConfigPanel()

      setActiveSection('tags')
      await nextTick()

      expect(activeSection.value).toBe('tags')
    })
  })

  describe('scroll position', () => {
    it('should set scroll position', () => {
      const { scrollPosition, setScrollPosition } = useConfigPanel()

      setScrollPosition(250)

      expect(scrollPosition.value).toBe(250)
    })
  })

  describe('UI store integration', () => {
    it('should update UI store when opening panel', async () => {
      const uiStore = useUIStore()
      const { openPanel } = useConfigPanel()

      openPanel()
      await nextTick()

      expect(uiStore.configPanelState.isOpen).toBe(true)
    })

    it('should update UI store when closing panel', async () => {
      const uiStore = useUIStore()
      const { openPanel, closePanel } = useConfigPanel()

      openPanel()
      await nextTick()
      closePanel()
      await nextTick()

      expect(uiStore.configPanelState.isOpen).toBe(false)
    })

    it('should update UI store section', async () => {
      const uiStore = useUIStore()
      const { setActiveSection } = useConfigPanel()

      setActiveSection('vocabulary')
      await nextTick()

      expect(uiStore.configPanelState.activeSection).toBe('vocabulary')
    })
  })

  describe('localStorage errors', () => {
    it('should handle setItem errors gracefully', async () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage full')
      })

      const { openPanel } = useConfigPanel()

      // Should not throw
      expect(() => openPanel()).not.toThrow()
    })
  })
})
