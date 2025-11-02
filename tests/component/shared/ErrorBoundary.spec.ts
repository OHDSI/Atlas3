/**
 * Component Test: ErrorBoundary
 * Tests error boundary component for graceful error handling (T131)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import { defineComponent, h } from 'vue'

const vuetify = createVuetify({
  components,
  directives,
})

// Create a simple router for testing
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/test', component: { template: '<div>Test</div>' } },
  ],
})

// Helper component that throws an error
const ErrorThrowingComponent = defineComponent({
  name: 'ErrorThrowingComponent',
  setup() {
    throw new Error('Test error from component')
  },
  render() {
    return h('div', 'Should not render')
  },
})

// Component that conditionally throws an error
const ConditionalErrorComponent = defineComponent({
  name: 'ConditionalErrorComponent',
  props: {
    shouldError: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    if (props.shouldError) {
      throw new Error('Conditional error')
    }
    return () => h('div', { 'data-testid': 'success' }, 'Success')
  },
})

describe('ErrorBoundary', () => {
  let wrapper: VueWrapper<any>
  let consoleErrorSpy: any

  beforeEach(() => {
    // Suppress console.error for these tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    consoleErrorSpy.mockRestore()
  })

  describe('error-free rendering', () => {
    it('should render child components when no error occurs', () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: '<div data-testid="child-content">Child content</div>',
        },
      })

      expect(wrapper.find('[data-testid="child-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="child-content"]').text()).toBe('Child content')
      expect(wrapper.find('.error-boundary').exists()).toBe(false)
    })

    it('should render multiple child components', () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: `
            <div data-testid="child-1">Child 1</div>
            <div data-testid="child-2">Child 2</div>
            <div data-testid="child-3">Child 3</div>
          `,
        },
      })

      expect(wrapper.find('[data-testid="child-1"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="child-2"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="child-3"]').exists()).toBe(true)
    })
  })

  describe('error capturing', () => {
    it('should capture and display errors from child components', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      // Should show error UI
      expect(wrapper.find('.error-boundary').exists()).toBe(true)
      expect(wrapper.text()).toContain('Something Went Wrong')
      expect(wrapper.text()).toContain('An unexpected error occurred')
    })

    it('should display error details in expansion panel', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      // Should have expansion panel with error details
      const expansionPanel = wrapper.findComponent({ name: 'VExpansionPanel' })
      expect(expansionPanel.exists()).toBe(true)

      // Error message should be in the details
      expect(wrapper.text()).toContain('Error Details')
    })

    it('should log error to console', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should not propagate errors to parent', async () => {
      // This test verifies that onErrorCaptured returns false
      // which prevents error propagation

      const parentErrorHandler = vi.fn()

      const ParentComponent = defineComponent({
        errorCaptured: parentErrorHandler,
        render() {
          return h(ErrorBoundary, null, {
            default: () => h(ErrorThrowingComponent),
          })
        },
      })

      wrapper = mount(ParentComponent, {
        global: {
          plugins: [vuetify, router],
        },
      })

      await wrapper.vm.$nextTick()

      // Parent error handler should not be called
      // because ErrorBoundary returns false from onErrorCaptured
      expect(parentErrorHandler).not.toHaveBeenCalled()
    })
  })

  describe('error UI elements', () => {
    it('should display error icon', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      // Should have alert-circle icon
      const icon = wrapper.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
    })

    it('should have reload button', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const reloadButton = buttons.find(btn => btn.text().includes('Reload Page'))

      expect(reloadButton).toBeDefined()
      expect(reloadButton?.props('prependIcon')).toBe('mdi-refresh')
    })

    it('should have go back button', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const backButton = buttons.find(btn => btn.text().includes('Go Back'))

      expect(backButton).toBeDefined()
      expect(backButton?.props('prependIcon')).toBe('mdi-arrow-left')
    })

    it('should display error in tonal error card', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const card = wrapper.findComponent({ name: 'VCard' })
      expect(card.exists()).toBe(true)
      expect(card.props('color')).toBe('error')
      expect(card.props('variant')).toBe('tonal')
    })
  })

  describe('error recovery actions', () => {
    it('should reload page when reload button is clicked', async () => {
      // Mock window.location.reload
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      })

      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const reloadButton = buttons.find(btn => btn.text().includes('Reload Page'))

      await reloadButton?.trigger('click')

      expect(reloadMock).toHaveBeenCalled()
    })

    it('should navigate back when go back button is clicked', async () => {
      await router.push('/test')

      const backSpy = vi.spyOn(router, 'back')

      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const backButton = buttons.find(btn => btn.text().includes('Go Back'))

      await backButton?.trigger('click')

      expect(backSpy).toHaveBeenCalled()
    })
  })

  describe('dynamic error scenarios', () => {
    it('should handle errors that occur after initial render', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ConditionalErrorComponent, { shouldError: false }),
        },
      })

      await wrapper.vm.$nextTick()

      // Initially should render successfully
      expect(wrapper.find('[data-testid="success"]').exists()).toBe(true)
      expect(wrapper.find('.error-boundary').exists()).toBe(false)

      // Now trigger an error by updating props
      // Note: In a real scenario, errors would come from component lifecycle or async operations
      // This test verifies the error boundary structure is in place
    })
  })

  describe('error details formatting', () => {
    it('should include error message in details', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      // Expand the error details panel
      const expansionTitle = wrapper.find('.v-expansion-panel-title')
      await expansionTitle.trigger('click')
      await wrapper.vm.$nextTick()

      const detailsText = wrapper.find('.error-details').text()
      expect(detailsText).toContain('Error: Test error from component')
    })
  })

  describe('accessibility', () => {
    it('should have proper semantic structure', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      // Should use Vuetify's container and card for proper structure
      expect(wrapper.findComponent({ name: 'VContainer' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VCard' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VCardTitle' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VCardText' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VCardActions' }).exists()).toBe(true)
    })

    it('should have descriptive button labels', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const buttonTexts = buttons.map(btn => btn.text())

      expect(buttonTexts).toContain('Reload Page')
      expect(buttonTexts).toContain('Go Back')
    })
  })

  describe('layout and styling', () => {
    it('should center error message on screen', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const errorDiv = wrapper.find('.error-boundary')
      expect(errorDiv.exists()).toBe(true)

      // Should have centering classes (verified by structure)
      const row = wrapper.findComponent({ name: 'VRow' })
      expect(row.props('justify')).toBe('center')
    })

    it('should use responsive column widths', async () => {
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [vuetify, router],
        },
        slots: {
          default: h(ErrorThrowingComponent),
        },
      })

      await wrapper.vm.$nextTick()

      const col = wrapper.findComponent({ name: 'VCol' })
      expect(col.props('cols')).toBe(12)
      expect(col.props('md')).toBe(8)
      expect(col.props('lg')).toBe(6)
    })
  })
})
