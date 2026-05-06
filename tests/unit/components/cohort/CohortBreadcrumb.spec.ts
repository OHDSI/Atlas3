/**
 * CohortBreadcrumb Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortBreadcrumb from '@/components/cohort/CohortBreadcrumb.vue'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    tv: (key: string, fallback?: string) => fallback || key
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(CohortBreadcrumb, {
    props: {
      modelValue: 'Test Cohort',
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VTooltip: {
          template: '<div><slot name="activator" :props="{}" /><slot /></div>'
        }
      }
    }
  })
}

describe('CohortBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render breadcrumb navigation', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.cohort-breadcrumb').exists()).toBe(true)
    })

    it('should display cohort definitions link', () => {
      const wrapper = mountComponent()

      const link = wrapper.find('.cohort-breadcrumb__item--link')
      expect(link.exists()).toBe(true)
      // Text should contain the translation key or fallback
      expect(link.text()).toBeTruthy()
    })

    it('should display separator', () => {
      const wrapper = mountComponent()

      const separator = wrapper.find('.cohort-breadcrumb__separator')
      expect(separator.exists()).toBe(true)
      expect(separator.text()).toBe('›')
    })

    it('should display active cohort name', () => {
      const wrapper = mountComponent({ modelValue: 'My Cohort' })

      const activeItem = wrapper.find('.cohort-breadcrumb__item--active')
      expect(activeItem.exists()).toBe(true)
      expect(activeItem.text()).toBe('My Cohort')
    })

    it('should display default name for new definition', () => {
      const wrapper = mountComponent({ modelValue: '' })

      const activeItem = wrapper.find('.cohort-breadcrumb__item--active')
      // Should show placeholder text when modelValue is empty
      expect(activeItem.text()).toBeTruthy()
    })

    it('should render edit icon', () => {
      const wrapper = mountComponent()

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      expect(editIcon.exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should label the breadcrumb nav landmark', () => {
      const wrapper = mountComponent()

      const nav = wrapper.find('nav.cohort-breadcrumb')
      expect(nav.exists()).toBe(true)
      expect(nav.attributes('aria-label')).toBe('Breadcrumb')
    })

    it('should mark the active item with aria-current="page"', () => {
      const wrapper = mountComponent({ modelValue: 'Active Cohort' })

      const activeItem = wrapper.find('.cohort-breadcrumb__item--active')
      expect(activeItem.attributes('aria-current')).toBe('page')
    })

    it('should not put aria-current on non-active items', () => {
      const wrapper = mountComponent()

      const link = wrapper.find('.cohort-breadcrumb__item--link')
      expect(link.attributes('aria-current')).toBeUndefined()
    })
  })

  describe('Navigation', () => {
    it('should emit navigate-back when link is clicked', async () => {
      const wrapper = mountComponent()

      const link = wrapper.find('.cohort-breadcrumb__item--link')
      await link.trigger('click')

      expect(wrapper.emitted('navigate-back')).toBeTruthy()
      expect(wrapper.emitted('navigate-back')).toHaveLength(1)
    })
  })

  describe('Edit Dialog', () => {
    it('should not show edit dialog initially', () => {
      const wrapper = mountComponent()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should open edit dialog when edit icon is clicked', async () => {
      const wrapper = mountComponent()

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(true)
    })

    it('should initialize editing name with current value when dialog opens', async () => {
      const wrapper = mountComponent({ modelValue: 'Current Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('modelValue')).toBe('Current Name')
    })

    it('should update editing name when text field changes', async () => {
      const wrapper = mountComponent({ modelValue: 'Old Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 'New Name')
      await wrapper.vm.$nextTick()

      expect(textField.props('modelValue')).toBe('New Name')
    })

    it('should emit update:modelValue when save button is clicked', async () => {
      const wrapper = mountComponent({ modelValue: 'Old Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 'New Name')
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.text().includes('Save'))
      await saveBtn?.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['New Name'])
    })

    it('should trim whitespace when saving', async () => {
      const wrapper = mountComponent({ modelValue: 'Old Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', '  New Name  ')
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.text().includes('Save'))
      await saveBtn?.trigger('click')

      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['New Name'])
    })

    it('should not emit update:modelValue when saving empty name', async () => {
      const wrapper = mountComponent({ modelValue: 'Old Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', '   ')
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.text().includes('Save'))
      await saveBtn?.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should close dialog when save button is clicked', async () => {
      const wrapper = mountComponent({ modelValue: 'Old Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 'New Name')
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveBtn = buttons.find(btn => btn.text().includes('Save'))
      await saveBtn?.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should close dialog when cancel button is clicked', async () => {
      const wrapper = mountComponent()

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel'))
      await cancelBtn?.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should save name when Enter key is pressed', async () => {
      const wrapper = mountComponent({ modelValue: 'Old Name' })

      const editIcon = wrapper.find('.cohort-breadcrumb__edit-icon')
      await editIcon.trigger('click')
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 'New Name')
      await wrapper.vm.$nextTick()

      await textField.trigger('keyup.enter')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['New Name'])
    })
  })
})
