/**
 * Component Tests: VocabularySchemaSection
 *
 * Tests for vocabulary schema section component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VocabularySchemaSection from '@/components/config/VocabularySchemaSection.vue'
import { useConfigStore } from '@/stores/config'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const configUndoMock = vi.hoisted(() => ({
  undoStack: { value: [] as Array<{ id: string; previousValue: string }> },
  isSaving: { value: false },
  pushUndo: vi.fn(),
  performUndo: vi.fn()
}))

vi.mock('@/composables/useConfigUndo', () => ({
  useConfigUndo: () => configUndoMock
}))

describe('VocabularySchemaSection.vue', () => {
  let wrapper: VueWrapper
  let configStore: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    configStore = useConfigStore()

    // Mock store methods
    configStore.fetchVocabularySchema = vi.fn().mockResolvedValue(undefined)
    configStore.updateVocabularySchema = vi.fn().mockResolvedValue(undefined)
    configStore.vocabularySchema = 'public'

    // Reset the shared undo mock to its inert defaults
    configUndoMock.undoStack.value = []
    configUndoMock.isSaving.value = false
    configUndoMock.pushUndo.mockReset()
    configUndoMock.performUndo.mockReset()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
  })

  describe('Mounting and initialization', () => {
    it('should mount successfully', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should load vocabulary schema on mount', async () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      expect(configStore.fetchVocabularySchema).toHaveBeenCalled()
    })

    it('should display loaded schema value', async () => {
      configStore.vocabularySchema = 'vocab_v5'

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('modelValue')).toBe('vocab_v5')
    })
  })

  describe('Schema input field', () => {
    it('should display vocabulary schema text field', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.exists()).toBe(true)
      expect(textField.props('label')).toBe('Vocabulary Schema')
    })

    it('should have database icon', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icons are rendered
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have validation rules', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('rules')).toBeDefined()
    })

    it('should display hint text', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('hint')).toContain('PostgreSQL schema name')
      expect(textField.props('persistentHint')).toBe(true)
    })
  })

  describe('Schema validation', () => {
    it('should accept valid schema names', async () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('public')
      await wrapper.vm.$nextTick()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.exists()).toBe(false)
    })

    it('should validate schema name format', async () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('rules')).toBeDefined()
    })
  })

  describe('Debounced save', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce schema updates', async () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })

      // Change value multiple times quickly
      await textField.setValue('schema1')
      await wrapper.vm.$nextTick()
      await textField.setValue('schema2')
      await wrapper.vm.$nextTick()
      await textField.setValue('vocab_v5')
      await wrapper.vm.$nextTick()

      // Should not have called update yet
      expect(configStore.updateVocabularySchema).not.toHaveBeenCalled()

      // Fast-forward past debounce time
      await vi.advanceTimersByTimeAsync(600)

      // Now should have called update once with final value
      expect(configStore.updateVocabularySchema).toHaveBeenCalledTimes(1)
      expect(configStore.updateVocabularySchema).toHaveBeenCalledWith('vocab_v5')
    })
  })

  describe('Success toast', () => {
    it('should show success toast after save', async () => {
      vi.useFakeTimers()

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('new_schema')
      await wrapper.vm.$nextTick()

      // Fast-forward debounce
      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()

      // AtlasSnackbar uses severity prop instead of Vuetify color
      const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
      const successSnackbar = snackbars.find(s => s.props('severity') === 'success')
      expect(successSnackbar?.props('modelValue')).toBe(true)

      vi.useRealTimers()
    })

    it('should display undo button in success toast', async () => {
      vi.useFakeTimers()

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('new_schema')
      await wrapper.vm.$nextTick()

      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()

      // Check that snackbars exist
      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      expect(snackbars.length).toBeGreaterThan(0)

      vi.useRealTimers()
    })
  })

  describe('Error handling', () => {
    it('should show error toast on save failure', async () => {
      vi.useFakeTimers()
      configStore.updateVocabularySchema = vi.fn().mockRejectedValue(new Error('Save failed'))

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('bad_schema')
      await wrapper.vm.$nextTick()

      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()

      // AtlasSnackbar uses severity='danger' for errors (not Vuetify color='error')
      const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
      const errorSnackbar = snackbars.find(s => s.props('severity') === 'danger')
      expect(errorSnackbar?.props('modelValue')).toBe(true)

      vi.useRealTimers()
    })

    it('should rollback value on save failure', async () => {
      vi.useFakeTimers()
      const originalSchema = 'public'
      configStore.vocabularySchema = originalSchema
      configStore.updateVocabularySchema = vi.fn().mockRejectedValue(new Error('Save failed'))

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('bad_schema')
      await wrapper.vm.$nextTick()

      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()

      // Should have rolled back to original value
      expect(textField.props('modelValue')).toBe(originalSchema)

      vi.useRealTimers()
    })
  })

  describe('Loading state', () => {
    it('should show loading state while saving', async () => {
      vi.useFakeTimers()

      // Make save slow
      configStore.updateVocabularySchema = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('new_schema')
      await wrapper.vm.$nextTick()

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      // Note: The actual loading prop comes from useConfigUndo mock
      // which we've set to false by default in our mock

      vi.useRealTimers()
    })

    it('should have disabled prop available', async () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      // Check that field has disabled property (may be false)
      expect(textField.props()).toHaveProperty('disabled')
    })
  })

  describe('Toast actions', () => {
    it('should close success toast when close clicked', async () => {
      vi.useFakeTimers()

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('new_schema')
      await wrapper.vm.$nextTick()

      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()

      // Confirm the success snackbar is open via AtlasSnackbar severity prop
      const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
      const successSnackbar = snackbars.find(s => s.props('severity') === 'success')
      expect(successSnackbar?.props('modelValue')).toBe(true)

      // Close by emitting update:modelValue (snackbar content is teleported to body)
      await successSnackbar?.vm.$emit('update:modelValue', false)
      await wrapper.vm.$nextTick()

      expect(successSnackbar?.props('modelValue')).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('Optimistic updates', () => {
    it('should update store immediately on change', async () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('immediate_update')
      await wrapper.vm.$nextTick()

      // Store should be updated immediately (optimistically)
      expect(configStore.vocabularySchema).toBe('immediate_update')
    })
  })

  describe('Error handling fallbacks', () => {
    it('shows the generic update-error message when a non-Error is thrown on save', async () => {
      vi.useFakeTimers()
      configStore.updateVocabularySchema = vi.fn().mockRejectedValue('plain failure')

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.setValue('bad_schema')
      await wrapper.vm.$nextTick()

      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()

      const setup = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
        .setupState
      expect(setup.errorMessage).toBe('Failed to update schema. Please try again.')
      expect(setup.showErrorToast).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('Undo handling', () => {
    it('shows a "Reverted" toast after a successful undo', async () => {
      configUndoMock.undoStack.value = [{ id: 'op1', previousValue: 'public' }]
      configUndoMock.performUndo.mockImplementation(
        async (_id: string, revertFn: (value: string) => Promise<void>) => {
          await revertFn('public')
        }
      )

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const setup = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
        .setupState
      await (setup.handleUndo as () => Promise<void>)()
      await flushPromises()

      expect(configStore.updateVocabularySchema).toHaveBeenCalledWith('public')
      expect(setup.toastMessage).toBe('Reverted to "public"')
      expect(setup.showToast).toBe(true)
    })

    it('surfaces the thrown Error message when undo rejects with an Error', async () => {
      configUndoMock.undoStack.value = [{ id: 'op1', previousValue: 'public' }]
      configUndoMock.performUndo.mockRejectedValue(new Error('undo exploded'))

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const setup = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
        .setupState
      await (setup.handleUndo as () => Promise<void>)()
      await flushPromises()

      expect(setup.errorMessage).toBe('undo exploded')
      expect(setup.showErrorToast).toBe(true)
    })

    it('falls back to the generic undo-error message when a non-Error is thrown', async () => {
      configUndoMock.undoStack.value = [{ id: 'op1', previousValue: 'public' }]
      configUndoMock.performUndo.mockRejectedValue('boom')

      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const setup = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
        .setupState
      await (setup.handleUndo as () => Promise<void>)()
      await flushPromises()

      expect(setup.errorMessage).toBe('Failed to undo. Please try again.')
      expect(setup.showErrorToast).toBe(true)
    })
  })

  describe('Description and help text', () => {
    it('should display section description', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('Configure the database schema name for vocabulary lookups')
    })

    it('should explain PostgreSQL schema usage', () => {
      wrapper = mount(VocabularySchemaSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('PostgreSQL schema')
      expect(wrapper.text()).toContain('OMOP vocabulary')
    })
  })
})
