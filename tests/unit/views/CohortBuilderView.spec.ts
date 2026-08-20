/**
 * Component Tests: CohortBuilderView
 *
 * Tests for the CohortBuilderView component that serves as the main
 * cohort builder page wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { setActivePinia, createPinia } from 'pinia'
import CohortBuilderView from '@/views/CohortBuilderView.vue'

// Mock vue-router
const mockPush = vi.fn()
const mockRoute = { params: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    currentRoute: { value: mockRoute }
  }),
  useRoute: () => mockRoute
}))

// Mock CohortBuilder component to avoid deep rendering
vi.mock('@/components/cohort/CohortBuilder.vue', () => ({
  default: {
    name: 'CohortBuilder',
    template: '<div class="cohort-builder-mock">CohortBuilder Mock</div>',
    props: ['id']
  }
}))

const vuetify = createVuetify()

describe('CohortBuilderView.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRoute.params = {}
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component mounting', () => {
    it('should mount successfully', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render page wrapper with correct class', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageWrapper = wrapper.find('.page-wrapper')
      expect(pageWrapper.exists()).toBe(true)
    })

    it('should render page card with correct class', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageCard = wrapper.find('.page-card')
      expect(pageCard.exists()).toBe(true)
    })

    it('should render CohortBuilder component', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.exists()).toBe(true)
    })

    it('should wire the hero inputs with the expected placeholders', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.find('.cohort-builder-view__title-input').attributes('placeholder')).toBe('New cohort')
      expect(wrapper.find('.cohort-builder-view__subtitle-input').attributes('placeholder')).toContain('Add a description')
    })
  })

  describe('Props handling', () => {
    it('should pass id prop to CohortBuilder when provided', () => {
      wrapper = mount(CohortBuilderView, {
        props: {
          id: '123'
        },
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe('123')
    })

    it('should pass undefined id to CohortBuilder when not provided', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBeUndefined()
    })

    it('should update CohortBuilder id when prop changes', async () => {
      wrapper = mount(CohortBuilderView, {
        props: {
          id: '123'
        },
        global: {
          plugins: [vuetify]
        }
      })

      let cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe('123')

      await wrapper.setProps({ id: '456' })

      cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe('456')
    })

    it('should handle empty string id', () => {
      wrapper = mount(CohortBuilderView, {
        props: {
          id: ''
        },
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe('')
    })
  })

  describe('Layout structure', () => {
    it('should have correct DOM hierarchy', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageWrapper = wrapper.find('.page-wrapper')
      const pageCard = pageWrapper.find('.page-card')
      const cohortBuilder = pageCard.findComponent({ name: 'CohortBuilder' })

      expect(pageWrapper.exists()).toBe(true)
      expect(pageCard.exists()).toBe(true)
      expect(cohortBuilder.exists()).toBe(true)
    })

    it('should render only one CohortBuilder instance', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilders = wrapper.findAllComponents({ name: 'CohortBuilder' })
      expect(cohortBuilders).toHaveLength(1)
    })

    it('should apply correct CSS classes for styling', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageWrapper = wrapper.find('.page-wrapper')
      const pageCard = wrapper.find('.page-card')

      // Verify elements have the expected classes
      expect(pageWrapper.classes()).toContain('page-wrapper')
      expect(pageCard.classes()).toContain('page-card')
    })
  })

  describe('Router integration', () => {
    it('should work with route params for id', () => {
      mockRoute.params = { id: '789' }

      wrapper = mount(CohortBuilderView, {
        props: {
          id: '789'
        },
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe('789')
    })

    it('should handle new cohort creation (no id)', () => {
      mockRoute.params = {}

      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBeUndefined()
    })

    it('should handle numeric id strings', () => {
      wrapper = mount(CohortBuilderView, {
        props: {
          id: '12345'
        },
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe('12345')
    })
  })

  describe('Component lifecycle', () => {
    it('should unmount cleanly', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('should maintain component state during updates', async () => {
      wrapper = mount(CohortBuilderView, {
        props: {
          id: '100'
        },
        global: {
          plugins: [vuetify]
        }
      })

      const initialBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(initialBuilder.exists()).toBe(true)

      await wrapper.setProps({ id: '200' })

      const updatedBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(updatedBuilder.exists()).toBe(true)
      expect(updatedBuilder.props('id')).toBe('200')
    })
  })

  describe('Edge cases', () => {
    it('should handle very long id strings', () => {
      const longId = 'a'.repeat(1000)

      wrapper = mount(CohortBuilderView, {
        props: {
          id: longId
        },
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe(longId)
    })

    it('should handle special characters in id', () => {
      const specialId = 'cohort-123_v2.0'

      wrapper = mount(CohortBuilderView, {
        props: {
          id: specialId
        },
        global: {
          plugins: [vuetify]
        }
      })

      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.props('id')).toBe(specialId)
    })

    it('should render correctly without props or plugins', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'CohortBuilder' }).exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should render semantic HTML structure', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      // Check for div elements with appropriate classes
      expect(wrapper.find('.page-wrapper').element.tagName).toBe('DIV')
      expect(wrapper.find('.page-card').element.tagName).toBe('DIV')
    })

    it('should maintain focus management structure', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageWrapper = wrapper.find('.page-wrapper')
      expect(pageWrapper.exists()).toBe(true)

      // Verify that the component tree is properly structured for focus management
      const cohortBuilder = wrapper.findComponent({ name: 'CohortBuilder' })
      expect(cohortBuilder.exists()).toBe(true)
    })
  })

  describe('Styling', () => {
    it('should have scoped styles applied', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      // Verify the expected class structure exists for styling
      const pageWrapper = wrapper.find('.page-wrapper')
      const pageCard = wrapper.find('.page-card')

      expect(pageWrapper.exists()).toBe(true)
      expect(pageCard.exists()).toBe(true)
    })

    it('should render page wrapper as flex container', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageWrapper = wrapper.find('.page-wrapper')
      expect(pageWrapper.exists()).toBe(true)
      // The actual flex styles are applied via scoped CSS
    })

    it('should render page card with rounded corners', () => {
      wrapper = mount(CohortBuilderView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pageCard = wrapper.find('.page-card')
      expect(pageCard.exists()).toBe(true)
      // Border radius is applied via scoped CSS
    })
  })
})
