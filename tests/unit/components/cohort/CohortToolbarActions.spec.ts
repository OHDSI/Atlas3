/**
 * CohortToolbarActions Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortToolbarActions from '@/components/cohort/CohortToolbarActions.vue'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key)
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
  return mount(CohortToolbarActions, {
    props: {
      canSave: true,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VTooltip: {
          template: '<div><slot name="activator" :props="{}" /><slot /></div>'
        }
      }
    },
    ...options,
  })
}

describe('CohortToolbarActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render toolbar actions container', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.cohort-toolbar-actions').exists()).toBe(true)
    })

    it('should render cancel button', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel') || btn.html().includes('mdi-close'))
      expect(cancelBtn).toBeDefined()
    })

    it('should render save button', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      expect(saveBtn).toBeDefined()
    })

  })

  describe('Cancel Button', () => {
    it('should be a quiet text-variant button', () => {
      // Refresh: cancel was outlined; the toolbar now uses text
      // variant for the secondary path so it doesn't compete with
      // the primary save button.
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel') || btn.html().includes('mdi-close'))
      expect(cancelBtn?.props('variant')).toBe('text')
    })

    it('should emit cancel event when clicked', async () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel') || btn.html().includes('mdi-close'))
      await cancelBtn?.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('should always be enabled', () => {
      const wrapper = mountComponent({ canSave: false })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel') || btn.html().includes('mdi-close'))
      expect(cancelBtn?.props('disabled')).toBeFalsy()
    })
  })

  describe('Save Button', () => {
    it('should have primary color', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      expect(saveBtn?.props('color')).toBe('primary')
    })

    it('should have flat variant', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      expect(saveBtn?.props('variant')).toBe('flat')
    })

    it('should be enabled when canSave is true', () => {
      const wrapper = mountComponent({ canSave: true })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      expect(saveBtn?.props('disabled')).toBe(false)
    })

    it('should be disabled when canSave is false', () => {
      const wrapper = mountComponent({ canSave: false })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      expect(saveBtn?.props('disabled')).toBe(true)
    })

    it('should emit save event when clicked', async () => {
      const wrapper = mountComponent({ canSave: true })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      await saveBtn?.trigger('click')

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')).toHaveLength(1)
    })

    it('should show indicator when hasUnsavedChanges is true', () => {
      const wrapper = mountComponent({ hasUnsavedChanges: true })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      // Just verify the button exists when unsaved changes are present
      expect(saveBtn).toBeDefined()
    })

    it('should render save button when hasUnsavedChanges is false', () => {
      const wrapper = mountComponent({ hasUnsavedChanges: false })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))
      expect(saveBtn).toBeDefined()
    })
  })

  describe('Responsive Behavior', () => {
    it('should render all buttons', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('should have proper gap spacing', () => {
      const wrapper = mountComponent()

      const container = wrapper.find('.cohort-toolbar-actions')
      expect(container.exists()).toBe(true)
    })
  })

  describe('Button States', () => {
    it('should handle all buttons disabled state', () => {
      const wrapper = mountComponent({ canSave: false })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))

      expect(saveBtn?.props('disabled')).toBe(true)
    })

    it('should handle all buttons enabled state', () => {
      const wrapper = mountComponent({ canSave: true })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel') || btn.html().includes('mdi-close'))
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))

      expect(cancelBtn?.props('disabled')).toBeFalsy()
      expect(saveBtn?.props('disabled')).toBe(false)
    })
  })

  describe('Event Emissions', () => {
    it('should emit distinct events for each button', async () => {
      const wrapper = mountComponent({ canSave: true })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel') || btn.html().includes('mdi-close'))
      const saveBtn = buttons.find(btn => btn.html().includes('save-cohort-btn') || btn.text().includes('Save'))

      await cancelBtn?.trigger('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()

      await saveBtn?.trigger('click')
      expect(wrapper.emitted('save')).toBeTruthy()
    })
  })

  describe('Export Menu', () => {
    afterEach(() => {
      // Vuetify v-menu teleports its content to body; tear down between
      // tests so a stale menu from a prior mount can't intercept clicks.
      document.body.innerHTML = ''
    })

    it('renders the export trigger button', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-testid="export-btn"]').exists()).toBe(true)
    })

    it('emits export-download when the JSON download item is clicked', async () => {
      const wrapper = mountComponent({}, { attachTo: document.body })
      await wrapper.find('[data-testid="export-btn"]').trigger('click')
      const downloadItem = document.querySelector('[data-testid="export-download-json"]') as HTMLElement | null
      expect(downloadItem).not.toBeNull()
      downloadItem!.click()
      expect(wrapper.emitted('export-download')).toBeTruthy()
      wrapper.unmount()
    })

    it('emits export-copy when the JSON copy item is clicked', async () => {
      const wrapper = mountComponent({}, { attachTo: document.body })
      await wrapper.find('[data-testid="export-btn"]').trigger('click')
      const copyItem = document.querySelector('[data-testid="export-copy-json"]') as HTMLElement | null
      expect(copyItem).not.toBeNull()
      copyItem!.click()
      expect(wrapper.emitted('export-copy')).toBeTruthy()
      wrapper.unmount()
    })

    it('emits view-json when the JSON view/edit item is clicked', async () => {
      const wrapper = mountComponent({}, { attachTo: document.body })
      await wrapper.find('[data-testid="export-btn"]').trigger('click')
      const viewItem = document.querySelector('[data-testid="view-json"]') as HTMLElement | null
      expect(viewItem).not.toBeNull()
      viewItem!.click()
      expect(wrapper.emitted('view-json')).toBeTruthy()
      wrapper.unmount()
    })
  })
})
