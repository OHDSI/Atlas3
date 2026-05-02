/**
 * Configuration Panel Composable
 *
 * Manages configuration panel state with localStorage persistence.
 * Handles panel open/close, section navigation, and scroll position tracking.
 */

import { ref, watch, onMounted } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useUIStore } from '@/stores/ui'
import { logger } from '@/utils/logger'

const STORAGE_PREFIX = 'atlas3-config-panel'
const SCROLL_DEBOUNCE = 500 // 500ms debounce for scroll position

export type ConfigSection = 'cache' | 'vocabulary' | 'tags'

export function useConfigPanel() {
  const uiStore = useUIStore()

  // State
  const isOpen = ref(false)
  const activeSection = ref<ConfigSection>('cache')
  const scrollPosition = ref(0)

  // LocalStorage keys
  const KEYS = {
    open: `${STORAGE_PREFIX}-open`,
    section: `${STORAGE_PREFIX}-section`,
    scroll: `${STORAGE_PREFIX}-scroll`,
  }

  /**
   * Loads panel state from localStorage
   */
  function loadState() {
    try {
      const savedOpen = localStorage.getItem(KEYS.open)
      if (savedOpen !== null) {
        isOpen.value = savedOpen === 'true'
      }

      const savedSection = localStorage.getItem(KEYS.section)
      if (savedSection && ['cache', 'vocabulary', 'tags'].includes(savedSection)) {
        activeSection.value = savedSection as ConfigSection
      }

      const savedScroll = localStorage.getItem(KEYS.scroll)
      if (savedScroll !== null) {
        scrollPosition.value = parseInt(savedScroll, 10) || 0
      }
    } catch (error) {
      logger.error('ConfigPanel', 'Failed to load config panel state', error)
      // Continue with defaults if localStorage fails
    }
  }

  /**
   * Saves a value to localStorage
   */
  function saveState(key: string, value: string | number | boolean) {
    try {
      localStorage.setItem(key, String(value))
    } catch (error) {
      logger.error('ConfigPanel', 'Failed to save config panel state', error)
      // Non-critical: fail silently
    }
  }

  // Watchers for persistence
  watch(isOpen, value => {
    saveState(KEYS.open, value)
    if (value) {
      uiStore.openConfigPanel()
    } else {
      uiStore.closeConfigPanel()
    }
  })

  watch(activeSection, value => {
    saveState(KEYS.section, value)
    uiStore.setConfigPanelSection(value)
  })

  // Debounced scroll persistence (prevents excessive writes)
  watchDebounced(
    scrollPosition,
    value => {
      saveState(KEYS.scroll, value)
      uiStore.setConfigPanelScroll(value)
    },
    { debounce: SCROLL_DEBOUNCE }
  )

  // Actions
  function openPanel() {
    isOpen.value = true
  }

  function closePanel() {
    isOpen.value = false
  }

  function togglePanel() {
    isOpen.value = !isOpen.value
  }

  function setActiveSection(section: ConfigSection) {
    activeSection.value = section
  }

  function setScrollPosition(position: number) {
    scrollPosition.value = position
  }

  // Initialize on mount
  onMounted(() => {
    loadState()
  })

  return {
    isOpen,
    activeSection,
    scrollPosition,
    openPanel,
    closePanel,
    togglePanel,
    setActiveSection,
    setScrollPosition,
    loadState,
  }
}
