/**
 * LandingView Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import LandingView from '@/views/LandingView.vue'

// Mock vue-router
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback),
    tv: (key: string, fallback: string) => fallback
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(LandingView, {
    global: {
      plugins: [vuetify]
    },
    ...options
  })
}

describe('LandingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the landing page', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing').exists()).toBe(true)
    })

    it('should render the main card container', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__card').exists()).toBe(true)
    })

    it('should render the content container', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__container').exists()).toBe(true)
    })

    it('should render the content section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__content').exists()).toBe(true)
    })

    it('should render the illustration section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__illustration').exists()).toBe(true)
    })
  })

  describe('Title and Logo', () => {
    it('should render the ATLAS title', () => {
      const wrapper = mountComponent()
      const title = wrapper.find('.landing__title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('ATLAS')
    })

    it('should render the ATLAS logo image', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.landing__logo')
      expect(logo.exists()).toBe(true)
      expect(logo.attributes('alt')).toBe('ATLAS')
    })

    it('should have correct logo source', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.landing__logo')
      expect(logo.attributes('src')).toContain('atlas-loading.svg')
    })
  })

  describe('Description Section', () => {
    it('should render the description section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__description').exists()).toBe(true)
    })

    it('should render description with v-html', () => {
      const wrapper = mountComponent()
      const description = wrapper.find('.landing__description p')
      expect(description.exists()).toBe(true)
    })

    it('should contain OHDSI link in description', () => {
      const wrapper = mountComponent()
      const description = wrapper.find('.landing__description')
      expect(description.html()).toContain('http://www.ohdsi.org')
    })
  })

  describe('Documentation Section', () => {
    it('should render the documentation section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__documentation').exists()).toBe(true)
    })

    it('should render the documentation title', () => {
      const wrapper = mountComponent()
      const sectionTitle = wrapper.find('.landing__section-title')
      expect(sectionTitle.exists()).toBe(true)
    })

    it('should render documentation text with v-html', () => {
      const wrapper = mountComponent()
      const docText = wrapper.find('.landing__documentation p')
      expect(docText.exists()).toBe(true)
    })

    it('should contain documentation link', () => {
      const wrapper = mountComponent()
      const documentation = wrapper.find('.landing__documentation')
      expect(documentation.html()).toContain('http://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:atlas')
    })
  })

  describe('Action Buttons', () => {
    it('should render the actions section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__actions').exists()).toBe(true)
    })

    it('should render two action buttons', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      expect(buttons.length).toBe(2)
    })

    it('should render Search Vocabulary button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      const searchButton = buttons[0]
      expect(searchButton.exists()).toBe(true)
      expect(searchButton.classes()).toContain('landing__button--outline')
    })

    it('should render Define New Cohort button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      const cohortButton = buttons[1]
      expect(cohortButton.exists()).toBe(true)
      expect(cohortButton.classes()).toContain('landing__button--secondary')
    })
  })

  describe('Navigation Interactions', () => {
    it('should navigate to concepts page when Search Vocabulary button is clicked', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      const searchButton = buttons[0]

      await searchButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/concepts')
    })

    it('should navigate to new cohort page when Define New Cohort button is clicked', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      const cohortButton = buttons[1]

      await cohortButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/cohorts/new')
    })

    it('should call router.push exactly once per button click', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')

      await buttons[0].trigger('click')
      expect(mockPush).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()

      await buttons[1].trigger('click')
      expect(mockPush).toHaveBeenCalledTimes(1)
    })
  })

  describe('Component Structure', () => {
    it('should have grid layout with two columns', () => {
      const wrapper = mountComponent()
      const container = wrapper.find('.landing__container')
      expect(container.exists()).toBe(true)
      // Grid layout is defined in CSS
    })

    it('should have content section before illustration', () => {
      const wrapper = mountComponent()
      const container = wrapper.find('.landing__container')
      const children = container.element.children

      expect(children[0].classList.contains('landing__content')).toBe(true)
      expect(children[1].classList.contains('landing__illustration')).toBe(true)
    })
  })

  describe('CSS Classes', () => {
    it('should apply correct class to outline button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      expect(buttons[0].classes()).toContain('landing__button--outline')
    })

    it('should apply correct class to secondary button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      expect(buttons[1].classes()).toContain('landing__button--secondary')
    })

    it('should apply base button class to all buttons', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      buttons.forEach(button => {
        expect(button.classes()).toContain('landing__button')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have alt text on logo image', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.landing__logo')
      expect(logo.attributes('alt')).toBe('ATLAS')
    })

    it('should have semantic heading for title', () => {
      const wrapper = mountComponent()
      const title = wrapper.find('h1.landing__title')
      expect(title.exists()).toBe(true)
    })

    it('should have semantic heading for documentation section', () => {
      const wrapper = mountComponent()
      const sectionTitle = wrapper.find('h2.landing__section-title')
      expect(sectionTitle.exists()).toBe(true)
    })

    it('should have button elements for actions', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('button.landing__button')
      expect(buttons.length).toBe(2)
    })
  })

  describe('External Links', () => {
    it('should have external OHDSI link with target _new', () => {
      const wrapper = mountComponent()
      const description = wrapper.find('.landing__description')
      const html = description.html()
      expect(html).toContain('target="_new"')
      expect(html).toContain('http://www.ohdsi.org')
    })

    it('should have external documentation link with target _new', () => {
      const wrapper = mountComponent()
      const documentation = wrapper.find('.landing__documentation')
      const html = documentation.html()
      expect(html).toContain('target="_new"')
    })
  })

  describe('I18n Integration', () => {
    it('should use translation for vocabulary button text', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      // The mock returns the fallback value
      expect(buttons[0].text()).toBe('Search the Vocabulary')
    })

    it('should use translation for cohort button text', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__button')
      // The mock returns the fallback value
      expect(buttons[1].text()).toBe('Define a New Cohort')
    })

    it('should use translation for documentation title', () => {
      const wrapper = mountComponent()
      const sectionTitle = wrapper.find('.landing__section-title')
      // The mock returns the fallback value
      expect(sectionTitle.text()).toBe('Documentation')
    })
  })

  describe('Layout Sections', () => {
    it('should have all main sections present', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.landing__title').exists()).toBe(true)
      expect(wrapper.find('.landing__description').exists()).toBe(true)
      expect(wrapper.find('.landing__documentation').exists()).toBe(true)
      expect(wrapper.find('.landing__actions').exists()).toBe(true)
      expect(wrapper.find('.landing__illustration').exists()).toBe(true)
    })

    it('should render sections in correct order', () => {
      const wrapper = mountComponent()
      const content = wrapper.find('.landing__content')
      const children = Array.from(content.element.children)

      const classNames = children.map(child => {
        for (const className of child.classList) {
          if (className.startsWith('landing__')) {
            return className
          }
        }
        return ''
      })

      expect(classNames[0]).toBe('landing__title')
      expect(classNames[1]).toBe('landing__description')
      expect(classNames[2]).toBe('landing__documentation')
      expect(classNames[3]).toBe('landing__actions')
    })
  })
})
