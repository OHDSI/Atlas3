/**
 * UI Store Tests
 * Tests for UI state management (panels, modals, event cards)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from '@/stores/ui'

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Panel Management', () => {
    it('should toggle panel expansion', () => {
      const store = useUIStore()
      const panelId = 'test-panel'

      expect(store.expandedPanels.has(panelId)).toBe(false)

      store.togglePanel(panelId)
      expect(store.expandedPanels.has(panelId)).toBe(true)

      store.togglePanel(panelId)
      expect(store.expandedPanels.has(panelId)).toBe(false)
    })

    it('should expand panel', () => {
      const store = useUIStore()
      const panelId = 'test-panel'

      store.expandPanel(panelId)
      expect(store.expandedPanels.has(panelId)).toBe(true)

      // Should remain expanded if called again
      store.expandPanel(panelId)
      expect(store.expandedPanels.has(panelId)).toBe(true)
    })

    it('should collapse panel', () => {
      const store = useUIStore()
      const panelId = 'test-panel'

      store.expandPanel(panelId)
      expect(store.expandedPanels.has(panelId)).toBe(true)

      store.collapsePanel(panelId)
      expect(store.expandedPanels.has(panelId)).toBe(false)
    })

    it('should check if panel is expanded', () => {
      const store = useUIStore()
      const panelId = 'test-panel'

      expect(store.isPanelExpanded(panelId)).toBe(false)

      store.expandPanel(panelId)
      expect(store.isPanelExpanded(panelId)).toBe(true)
    })
  })

  describe('Modal Management', () => {
    it('should open modal', () => {
      const store = useUIStore()
      const modalId = 'test-modal'

      expect(store.openModals.has(modalId)).toBe(false)

      store.openModal(modalId)
      expect(store.openModals.has(modalId)).toBe(true)
    })

    it('should close modal', () => {
      const store = useUIStore()
      const modalId = 'test-modal'

      store.openModal(modalId)
      expect(store.openModals.has(modalId)).toBe(true)

      store.closeModal(modalId)
      expect(store.openModals.has(modalId)).toBe(false)
    })

    it('should check if modal is open', () => {
      const store = useUIStore()
      const modalId = 'test-modal'

      expect(store.isModalOpen(modalId)).toBe(false)

      store.openModal(modalId)
      expect(store.isModalOpen(modalId)).toBe(true)
    })
  })

  describe('Event Card Management', () => {
    it('should toggle event card expansion', () => {
      const store = useUIStore()
      const eventId = 'event-123'

      expect(store.expandedEventCards.has(eventId)).toBe(false)

      store.toggleEventCard(eventId)
      expect(store.expandedEventCards.has(eventId)).toBe(true)

      store.toggleEventCard(eventId)
      expect(store.expandedEventCards.has(eventId)).toBe(false)
    })

    it('should check if event card is expanded', () => {
      const store = useUIStore()
      const eventId = 'event-123'

      expect(store.isEventCardExpanded(eventId)).toBe(false)

      store.toggleEventCard(eventId)
      expect(store.isEventCardExpanded(eventId)).toBe(true)
    })
  })

  describe('Clear All', () => {
    it('should clear all UI state', () => {
      const store = useUIStore()

      // Set up some state
      store.expandPanel('panel-1')
      store.expandPanel('panel-2')
      store.openModal('modal-1')
      store.toggleEventCard('event-1')

      expect(store.expandedPanels.size).toBe(2)
      expect(store.openModals.size).toBe(1)
      expect(store.expandedEventCards.size).toBe(1)

      // Clear all
      store.clearAll()

      expect(store.expandedPanels.size).toBe(0)
      expect(store.openModals.size).toBe(0)
      expect(store.expandedEventCards.size).toBe(0)
    })
  })
})
