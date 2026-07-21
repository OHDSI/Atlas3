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
      totalConceptSets: 0,
      unusedConceptSetCount: 0,
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

    // Description editing moved to the inline-edit subtitle in the
    // page-shell hero header. The toolbar status component no longer
    // renders a description input or a "DESCRIPTION:" label.
  })

  describe('Concept Sets Badge', () => {
    it('should render the concept sets icon when count is 0 (disabled, no badge)', () => {
      // Behavior changed: the icon now always renders so the toolbar shape
      // stays stable across builders. When the count is 0 the icon is dim
      // and the badge content is hidden (v-badge :model-value="false").
      const wrapper = mountComponent({ conceptSetCount: 0 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      expect(conceptIcon.exists()).toBe(true)
    })

    it('should show concept sets badge when count > 0', () => {
      const wrapper = mountComponent({ totalConceptSets: 5 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      expect(conceptIcon.exists()).toBe(true)
    })

    it('should display correct unused concept set count in badge', () => {
      const wrapper = mountComponent({ totalConceptSets: 5, unusedConceptSetCount: 3 })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const conceptBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="concept-sets-icon"]')
        return icon.exists()
      })
      expect(conceptBadge?.props('content')).toBe(3)
    })

    it('should have primary color badge', () => {
      const wrapper = mountComponent({ totalConceptSets: 3, unusedConceptSetCount: 2 })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      const conceptBadge = badges.find(badge => {
        const icon = badge.find('[data-testid="concept-sets-icon"]')
        return icon.exists()
      })
      expect(conceptBadge?.props('color')).toBe('primary')
    })

    it('should emit show-concept-sets when clicked', async () => {
      const wrapper = mountComponent({ totalConceptSets: 3, unusedConceptSetCount: 1 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      await conceptIcon.trigger('click')

      expect(wrapper.emitted('show-concept-sets')).toBeTruthy()
    })

    it('should have shape icon', () => {
      const wrapper = mountComponent({ totalConceptSets: 3, unusedConceptSetCount: 1 })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      // Check that icon is rendered with the shape identifier
      expect(conceptIcon.exists()).toBe(true)
      expect(conceptIcon.html()).toContain('mdi-shape')
    })
  })

  describe('Validation Status', () => {
    it('should show loading icon when validating', () => {
      const wrapper = mountComponent({ isValidating: true })

      const loadingIcon = wrapper.find('[data-testid="validation-icon-loading"]')
      expect(loadingIcon.exists()).toBe(true)
    })

    it('should not show validation icon when validating', () => {
      const wrapper = mountComponent({
        isValidating: true,
        validationCount: 5
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      expect(validationIcon.exists()).toBe(false)
    })

    it('should show validation icon even when count is 0', () => {
      const wrapper = mountComponent({
        validationCount: 0,
        isValidating: false
      })

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      expect(validationIcon.exists()).toBe(true)
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

    it('should show concept sets and loading icon when validating', () => {
      const wrapper = mountComponent({
        conceptSetCount: 3,
        validationCount: 0,
        isValidating: true
      })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      const loadingIcon = wrapper.find('[data-testid="validation-icon-loading"]')

      expect(conceptIcon.exists()).toBe(true)
      expect(loadingIcon.exists()).toBe(true)
    })

    it('should handle all zero counts - validation icon still shows', () => {
      const wrapper = mountComponent({
        conceptSetCount: 0,
        validationCount: 0,
        isValidating: false
      })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      const loadingIcon = wrapper.find('[data-testid="validation-icon-loading"]')

      // Concept-sets icon also always shows now (disabled state when 0).
      expect(conceptIcon.exists()).toBe(true)
      expect(validationIcon.exists()).toBe(true)
      expect(loadingIcon.exists()).toBe(false)
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
    it('should emit toolbar action events correctly', async () => {
      // Description update events removed — see header note above.
      const wrapper = mountComponent({
        totalConceptSets: 3,
        unusedConceptSetCount: 1,
        validationCount: 5,
        isValidating: false
      })

      const conceptIcon = wrapper.find('[data-testid="concept-sets-icon"]')
      await conceptIcon.trigger('click')
      expect(wrapper.emitted('show-concept-sets')).toBeTruthy()

      const validationIcon = wrapper.find('[data-testid="validation-icon"]')
      await validationIcon.trigger('click')
      expect(wrapper.emitted('show-validation')).toBeTruthy()
    })
  })
})
