/**
 * CohortMetadata Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortMetadata from '@/components/cohort/CohortMetadata.vue'
import type { Tag } from '@/models/cohort.types'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key)
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(CohortMetadata, {
    props: {
      name: 'Test Cohort',
      description: 'Test description',
      tags: [],
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

describe('CohortMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render card', () => {
      const wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'VCard' }).exists()).toBe(true)
    })

    it('should display card title', () => {
      const wrapper = mountComponent()

      const cardTitle = wrapper.findComponent({ name: 'VCardTitle' })
      expect(cardTitle.exists()).toBe(true)
      expect(cardTitle.text()).toContain('Cohort Definition')
    })

    it('should render name field', () => {
      const wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.exists()).toBe(true)
      expect(textField.props('modelValue')).toBe('Test Cohort')
    })

    it('should render description field', () => {
      const wrapper = mountComponent()

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.exists()).toBe(true)
      expect(textarea.props('modelValue')).toBe('Test description')
    })

    it('should render tags section', () => {
      const wrapper = mountComponent()

      const tagsLabel = wrapper.find('.metadata-tags__label')
      expect(tagsLabel.exists()).toBe(true)
      expect(tagsLabel.text()).toBe('Tags')
    })
  })

  describe('Name Field', () => {
    it('should display name prop value', () => {
      const wrapper = mountComponent({ name: 'My Cohort Name' })

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('modelValue')).toBe('My Cohort Name')
    })

    it('should have name label', () => {
      const wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('label')).toBe('Name')
    })

    it('should have name placeholder', () => {
      const wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('placeholder')).toBe('Enter cohort name')
    })

    it('should emit update:name when name changes', async () => {
      const wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 'New Name')

      expect(wrapper.emitted('update:name')).toBeTruthy()
      expect(wrapper.emitted('update:name')![0]).toEqual(['New Name'])
    })

    it('should update local name when prop changes', async () => {
      const wrapper = mountComponent({ name: 'Old Name' })

      await wrapper.setProps({ name: 'Updated Name' })
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('modelValue')).toBe('Updated Name')
    })

    it('should have required validation rule', () => {
      const wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('rules')).toBeDefined()
      expect(textField.props('rules')).toHaveLength(1)
    })
  })

  describe('Description Field', () => {
    it('should display description prop value', () => {
      const wrapper = mountComponent({ description: 'My description' })

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.props('modelValue')).toBe('My description')
    })

    it('should handle undefined description', () => {
      const wrapper = mountComponent({ description: undefined })

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.props('modelValue')).toBe('')
    })

    it('should have description label', () => {
      const wrapper = mountComponent()

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.props('label')).toBe('Description')
    })

    it('should have description placeholder', () => {
      const wrapper = mountComponent()

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.props('placeholder')).toBe('Enter cohort description (optional)')
    })

    it('should emit update:description when description changes', async () => {
      const wrapper = mountComponent()

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      await textarea.vm.$emit('update:modelValue', 'New Description')

      expect(wrapper.emitted('update:description')).toBeTruthy()
      expect(wrapper.emitted('update:description')![0]).toEqual(['New Description'])
    })

    it('should update local description when prop changes', async () => {
      const wrapper = mountComponent({ description: 'Old Description' })

      await wrapper.setProps({ description: 'Updated Description' })
      await wrapper.vm.$nextTick()

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.props('modelValue')).toBe('Updated Description')
    })
  })

  describe('Tags Display', () => {
    const mockTags: Tag[] = [
      { name: 'Diabetes', color: '#ff5252' },
      { name: 'Heart Disease', color: '#2196f3' }
    ]

    it('should display existing tags', () => {
      const wrapper = mountComponent({ tags: mockTags })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      expect(chips.length).toBeGreaterThanOrEqual(2)
      expect(wrapper.text()).toContain('Diabetes')
      expect(wrapper.text()).toContain('Heart Disease')
    })

    it('should show tags with colors', () => {
      const wrapper = mountComponent({ tags: mockTags })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const diabetesChip = chips.find(chip => chip.text() === 'Diabetes')
      expect(diabetesChip?.props('color')).toBe('#ff5252')
    })

    it('should use default color when tag has no color', () => {
      const tagsNoColor: Tag[] = [{ name: 'Test Tag' }]
      const wrapper = mountComponent({ tags: tagsNoColor })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const testChip = chips.find(chip => chip.text() === 'Test Tag')
      expect(testChip?.props('color')).toBe('var(--atlas-color-primary)')
    })

    it('should not show tags list when no tags', () => {
      const wrapper = mountComponent({ tags: [] })

      const tagsList = wrapper.find('.metadata-tags__list')
      expect(tagsList.exists()).toBe(false)
    })

    it('should make tags closable', () => {
      const wrapper = mountComponent({ tags: mockTags })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const diabetesChip = chips.find(chip => chip.text() === 'Diabetes')
      expect(diabetesChip?.props('closable')).toBe(true)
    })
  })

  describe('Tag Addition', () => {
    it('should render tag input field', () => {
      const wrapper = mountComponent()

      const inputs = wrapper.findAllComponents({ name: 'VTextField' })
      const tagInput = inputs.find(input => input.props('label') === 'Add tag')
      expect(tagInput).toBeDefined()
    })

    it('should have color picker button', () => {
      const wrapper = mountComponent()

      const menu = wrapper.findComponent({ name: 'VMenu' })
      expect(menu.exists()).toBe(true)
    })

    it('should have tag addition UI components', () => {
      const wrapper = mountComponent()

      // Check for tags add section
      const tagsSection = wrapper.find('.metadata-tags__add')
      expect(tagsSection.exists()).toBe(true)
    })
  })

  describe('Tag Removal', () => {
    const mockTags: Tag[] = [
      { name: 'Tag 1', color: '#ff5252' },
      { name: 'Tag 2', color: '#2196f3' }
    ]

    it('should have closable tags when tags are present', () => {
      const wrapper = mountComponent({ tags: mockTags })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      expect(chips.length).toBeGreaterThanOrEqual(2)

      // Tags should be closable
      const tag1Chip = chips.find(chip => chip.text() === 'Tag 1')
      expect(tag1Chip?.props('closable')).toBe(true)
    })
  })

  describe('Props Synchronization', () => {
    it('should sync tags when props change', async () => {
      const wrapper = mountComponent({ tags: [] })

      const newTags: Tag[] = [{ name: 'New Tag', color: '#ff5252' }]
      await wrapper.setProps({ tags: newTags })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('New Tag')
    })
  })
})
