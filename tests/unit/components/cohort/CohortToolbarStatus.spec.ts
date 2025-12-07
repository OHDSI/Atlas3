/**
 * CohortToolbarStatus Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortToolbarStatus from '@/components/cohort/CohortToolbarStatus.vue'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key)
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(CohortToolbarStatus, {
    props: {
      description: 'Test description',
      conceptSetCount: 0,
      validationCount: 0,
      validationColor: 'success',
      isValidating: false,
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

describe('CohortToolbarStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render toolbar status container', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.cohort-toolbar-status').exists()).toBe(true)
    })

    it('should render description section', () => {
      const wrapper = mountComponent()

      const descSection = wrapper.find('.cohort-toolbar-status__description')
      expect(descSection.exists()).toBe(true)
    })
  })

  describe('Description Input', () => {
    it('should display description value', () => {
      const wrapper = mountComponent({ description: 'My cohort description' })

      const input = wrapper.find('[data-testid="cohort-description-input"]')
      expect(input.element.value).toBe('My cohort description')
    })

    it('should have description label on desktop', () => {
      const wrapper = mountComponent()

      const label = wrapper.find('.cohort-toolbar-status__label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('DESCRIPTION')
    })

    it('should emit update:description when input changes', async () => {
      const wrapper = mountComponent({ description: 'Old description' })

      const input = wrapper.find('[data-testid="cohort-description-input"]')
      await input.setValue('New description')

      expect(wrapper.emitted('update:description')).toBeTruthy()
      expect(wrapper.emitted('update:description')![0]).toEqual(['New description'])
    })

    it('should have placeholder text', () => {
      const wrapper = mountComponent()

      const input = wrapper.find('[data-testid="cohort-description-input"]')
      expect(input.attributes('placeholder')).toBe('Description')
    })
  })

  describe('Description Dialog (Mobile)', () => {
    it('should not show dialog initially', () => {
      const wrapper = mountComponent()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should have mobile icon button', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const dialogBtn = buttons.find(btn => btn.props('icon') === 'mdi-text')
      expect(dialogBtn).toBeDefined()
    })

    it('should have dialog with textarea', () => {
      const wrapper = mountComponent()

      // The dialog exists in the DOM
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.exists()).toBe(true)
    })
  })

  describe('Concept Sets Badge', () => {
    it('should not show concept sets badge when count is 0', () => {
      const wrapper = mountComponent({ conceptSetCount: 0 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      expect(conceptIcon.exists()).toBe(false)
    })

    it('should show concept sets badge when count > 0', () => {
      const wrapper = mountComponent({ conceptSetCount: 5 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      expect(conceptIcon.exists()).toBe(true)
    })

    it('should display correct concept set count', () => {
      const wrapper = mountComponent({ conceptSetCount: 3 })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const conceptBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="concept-sets-icon"]')
        return icon.exists()
      })
      expect(conceptBadge?.props('content')).toBe(3)
    })

    it('should have primary color badge', () => {
      const wrapper = mountComponent({ conceptSetCount: 3 })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const conceptBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="concept-sets-icon"]')
        return icon.exists()
      })
      expect(conceptBadge?.props('color')).toBe('primary')
    })

    it('should emit show-concept-sets when clicked', async () => {
      const wrapper = mountComponent({ conceptSetCount: 3 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      await conceptIcon.trigger('click')

      expect(wrapper.emitted('show-concept-sets')).toBeTruthy()
    })

    it('should have shape icon', () => {
      const wrapper = mountComponent({ conceptSetCount: 3 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      // Check that icon is rendered with the shape identifier
      expect(conceptIcon.exists()).toBe(true)
      expect(conceptIcon.html()).toContain('mdi-shape')
    })
  })

  describe('Validation Status', () => {
    it('should show loading spinner when validating', () => {
      const wrapper = mountComponent({ isValidating: true })

      const spinner = wrapper.findComponent({ name: 'VProgressCircular' })
      expect(spinner.exists()).toBe(true)
      expect(spinner.props('indeterminate')).toBe(true)
    })

    it('should not show validation badge when validating', () => {
      const wrapper = mountComponent({
        isValidating: true,
        validationCount: 5
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      expect(validationIcon.exists()).toBe(false)
    })

    it('should not show validation badge when count is 0', () => {
      const wrapper = mountComponent({
        validationCount: 0,
        isValidating: false
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      expect(validationIcon.exists()).toBe(false)
    })

    it('should show validation badge when count > 0 and not validating', () => {
      const wrapper = mountComponent({
        validationCount: 3,
        isValidating: false
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      expect(validationIcon.exists()).toBe(true)
    })

    it('should display correct validation count', () => {
      const wrapper = mountComponent({
        validationCount: 7,
        isValidating: false
      })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const validationBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="validation-icon"]')
        return icon.exists()
      })
      expect(validationBadge?.props('content')).toBe(7)
    })

    it('should use correct validation color', () => {
      const wrapper = mountComponent({
        validationCount: 3,
        validationColor: 'error',
        isValidating: false
      })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const validationBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="validation-icon"]')
        return icon.exists()
      })
      expect(validationBadge?.props('color')).toBe('error')
    })

    it('should emit show-validation when validation icon is clicked', async () => {
      const wrapper = mountComponent({
        validationCount: 3,
        isValidating: false
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      await validationIcon.trigger('click')

      expect(wrapper.emitted('show-validation')).toBeTruthy()
    })

    it('should have message icon for validation', () => {
      const wrapper = mountComponent({
        validationCount: 3,
        isValidating: false
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      // Check that icon is rendered with the message identifier
      expect(validationIcon.exists()).toBe(true)
      expect(validationIcon.html()).toContain('mdi-message')
    })
  })

  describe('Combined State', () => {
    it('should show both concept sets and validation badges', () => {
      const wrapper = mountComponent({
        conceptSetCount: 3,
        validationCount: 5,
        isValidating: false
      })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      const validationIcon = wrapper.find('[data-testid="validation-icon"]')

      expect(conceptIcon.exists()).toBe(true)
      expect(validationIcon.exists()).toBe(true)
    })

    it('should show concept sets and spinner when validating', () => {
      const wrapper = mountComponent({
        conceptSetCount: 3,
        validationCount: 0,
        isValidating: true
      })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      const spinner = wrapper.findComponent({ name: 'VProgressCircular' })

      expect(conceptIcon.exists()).toBe(true)
      expect(spinner.exists()).toBe(true)
    })

    it('should handle all zero counts', () => {
      const wrapper = mountComponent({
        conceptSetCount: 0,
        validationCount: 0,
        isValidating: false
      })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      const spinner = wrapper.findComponent({ name: 'VProgressCircular' })

      expect(conceptIcon.exists()).toBe(false)
      expect(validationIcon.exists()).toBe(false)
      expect(spinner.exists()).toBe(false)
    })
  })

  describe('Props Validation', () => {
    it('should handle different validation colors', () => {
      const colors = ['success', 'warning', 'error', 'info']

      colors.forEach(color => {
        const wrapper = mountComponent({
          validationCount: 3,
          validationColor: color,
          isValidating: false
        })

        const badges = wrapper.findAllComponents({ name: 'VBadge' })
        const validationBadge = badges.find(badge => {
          const icon = badge.find('[data-testid="validation-icon"]')
          return icon.exists()
        })
        expect(validationBadge?.props('color')).toBe(color)
      })
    })

    it('should handle empty description', () => {
      const wrapper = mountComponent({ description: '' })

      const input = wrapper.find('[data-testid="cohort-description-input"]')
      expect(input.element.value).toBe('')
    })

    it('should handle large validation count', () => {
      const wrapper = mountComponent({
        validationCount: 999,
        isValidating: false
      })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const validationBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="validation-icon"]')
        return icon.exists()
      })
      expect(validationBadge?.props('content')).toBe(999)
    })
  })

  describe('Event Handling', () => {
    it('should emit all events correctly', async () => {
      const wrapper = mountComponent({
        description: 'Test',
        conceptSetCount: 3,
        validationCount: 5,
        isValidating: false
      })

      // Test description update
      const input = wrapper.find('[data-testid="cohort-description-input"]')
      await input.setValue('Updated')
      expect(wrapper.emitted('update:description')).toBeTruthy()

      // Test show concept sets
      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      await conceptIcon.trigger('click')
      expect(wrapper.emitted('show-concept-sets')).toBeTruthy()

      // Test show validation
      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      await validationIcon.trigger('click')
      expect(wrapper.emitted('show-validation')).toBeTruthy()
    })
  })
})
