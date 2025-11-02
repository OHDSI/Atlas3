/**
 * UI Store
 * Manages UI state (modals, panels, expanded/collapsed states)
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // State
  const expandedPanels = ref<Set<string>>(new Set())
  const openModals = ref<Set<string>>(new Set())
  const expandedEventCards = ref<Set<string>>(new Set())

  // Actions
  function togglePanel(panelId: string) {
    if (expandedPanels.value.has(panelId)) {
      expandedPanels.value.delete(panelId)
    } else {
      expandedPanels.value.add(panelId)
    }
  }

  function expandPanel(panelId: string) {
    expandedPanels.value.add(panelId)
  }

  function collapsePanel(panelId: string) {
    expandedPanels.value.delete(panelId)
  }

  function isPanelExpanded(panelId: string): boolean {
    return expandedPanels.value.has(panelId)
  }

  function openModal(modalId: string) {
    openModals.value.add(modalId)
  }

  function closeModal(modalId: string) {
    openModals.value.delete(modalId)
  }

  function isModalOpen(modalId: string): boolean {
    return openModals.value.has(modalId)
  }

  function toggleEventCard(eventId: string) {
    if (expandedEventCards.value.has(eventId)) {
      expandedEventCards.value.delete(eventId)
    } else {
      expandedEventCards.value.add(eventId)
    }
  }

  function isEventCardExpanded(eventId: string): boolean {
    return expandedEventCards.value.has(eventId)
  }

  function clearAll() {
    expandedPanels.value.clear()
    openModals.value.clear()
    expandedEventCards.value.clear()
  }

  return {
    // State
    expandedPanels,
    openModals,
    expandedEventCards,
    // Actions
    togglePanel,
    expandPanel,
    collapsePanel,
    isPanelExpanded,
    openModal,
    closeModal,
    isModalOpen,
    toggleEventCard,
    isEventCardExpanded,
    clearAll,
  }
})
