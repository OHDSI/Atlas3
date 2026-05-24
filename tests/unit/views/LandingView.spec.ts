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
      plugins: [vuetify],
      stubs: {
        RouterLink: {
          template: '<a :href="to" class="router-link"><slot /></a>',
          props: ['to']
        }
      }
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

    it('should render the hero card', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__hero').exists()).toBe(true)
    })

    it('should render the hero grid', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__hero-grid').exists()).toBe(true)
    })

    it('should render the hero content section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__hero-content').exists()).toBe(true)
    })

    it('should render the illustration section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__illustration').exists()).toBe(true)
    })
  })

  describe('Title and Logo', () => {
    it('should render the display title', () => {
      const wrapper = mountComponent()
      const title = wrapper.find('.landing__title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Patient-level analytics, unified.')
    })

    it('should render the Atlas logo image', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.landing__logo')
      expect(logo.exists()).toBe(true)
      expect(logo.attributes('alt')).toBe('Atlas')
    })

    it('should have correct logo source', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.landing__logo')
      expect(logo.attributes('src')).toContain('atlas-loading.svg')
    })
  })

  describe('Eyebrow Row', () => {
    it('should render the eyebrow row', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__eyebrow-row').exists()).toBe(true)
    })

    it('should render the accent rule', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__accent-rule').exists()).toBe(true)
    })

    it('should render the eyebrow text', () => {
      const wrapper = mountComponent()
      const eyebrow = wrapper.find('.text-eyebrow')
      expect(eyebrow.exists()).toBe(true)
      expect(eyebrow.text()).toContain('OHDSI')
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
    // The documentation entry is now a full-width clickable AtlasCard tile
    // styled like the analysis feature tiles (icon + title + description),
    // sitting in its own row below the analysis tiles — not a wide card
    // with a button. Selector reflects the new `.landing__feature--docs`
    // class added in the landing redesign.
    it('should render the documentation tile', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__feature--docs').exists()).toBe(true)
    })

    it('should render the documentation title text', () => {
      const wrapper = mountComponent()
      const docs = wrapper.find('.landing__feature--docs')
      expect(docs.text()).toContain('Documentation')
    })

    it('should link the entire documentation tile to /docs', () => {
      const wrapper = mountComponent()
      const docs = wrapper.find('.landing__feature--docs')
      expect(docs.html()).toContain('href="/docs"')
    })
  })

  describe('Action Buttons', () => {
    it('should render the actions section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__actions').exists()).toBe(true)
    })

    it('should render two action buttons', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      expect(buttons.length).toBe(2)
    })

    it('should render Define New Cohort button first', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      const cohortButton = buttons[0]
      expect(cohortButton.exists()).toBe(true)
    })

    it('should render Search Vocabulary button second', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      const searchButton = buttons[1]
      expect(searchButton.exists()).toBe(true)
    })
  })

  describe('Navigation Interactions', () => {
    it('should navigate to new cohort page when Define New Cohort button is clicked', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      const cohortButton = buttons[0]

      await cohortButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/cohorts/new')
    })

    it('should navigate to concepts page when Search Vocabulary button is clicked', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      const searchButton = buttons[1]

      await searchButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/concepts')
    })

    it('should call router.push exactly once per button click', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')

      await buttons[0].trigger('click')
      expect(mockPush).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()

      await buttons[1].trigger('click')
      expect(mockPush).toHaveBeenCalledTimes(1)
    })
  })

  describe('Component Structure', () => {
    it('should have grid layout in the hero', () => {
      const wrapper = mountComponent()
      const grid = wrapper.find('.landing__hero-grid')
      expect(grid.exists()).toBe(true)
      // Grid layout is defined in CSS
    })

    it('should have hero-content section before illustration', () => {
      const wrapper = mountComponent()
      const grid = wrapper.find('.landing__hero-grid')
      const children = grid.element.children

      expect(children[0].classList.contains('landing__hero-content')).toBe(true)
      expect(children[1].classList.contains('landing__illustration')).toBe(true)
    })
  })

  describe('Feature Tiles', () => {
    it('should render the features section', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.landing__features').exists()).toBe(true)
    })

    it('should render four feature tiles', () => {
      const wrapper = mountComponent()
      const features = wrapper.findAll('.landing__feature')
      expect(features.length).toBe(4)
    })

    it('should render feature titles', () => {
      const wrapper = mountComponent()
      const featureTitles = wrapper.findAll('.landing__feature-title')
      expect(featureTitles.length).toBe(4)
    })

    it('should render feature descriptions', () => {
      const wrapper = mountComponent()
      const featureDescriptions = wrapper.findAll('.landing__feature-description')
      expect(featureDescriptions.length).toBe(4)
    })

    it('should render feature icons', () => {
      const wrapper = mountComponent()
      const featureIcons = wrapper.findAll('.landing__feature-icon')
      expect(featureIcons.length).toBe(4)
    })
  })

  describe('Accessibility', () => {
    it('should have alt text on logo image', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.landing__logo')
      expect(logo.attributes('alt')).toBe('Atlas')
    })

    it('should have semantic heading for title', () => {
      const wrapper = mountComponent()
      const title = wrapper.find('h1.landing__title')
      expect(title.exists()).toBe(true)
    })

    it('should expose the documentation tile as a link for screen readers', () => {
      const wrapper = mountComponent()
      const docs = wrapper.find('.landing__feature--docs')
      // router-link renders as <a href> — that's the semantic affordance.
      expect(docs.element.tagName.toLowerCase()).toBe('a')
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

    it('should link the documentation tile to the in-app manual', () => {
      const wrapper = mountComponent()
      const documentation = wrapper.find('.landing__feature--docs')
      const html = documentation.html()
      expect(html).toContain('href="/docs"')
    })
  })

  describe('I18n Integration', () => {
    it('should use translation for cohort button text', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      // The mock returns the fallback value; new casing: lowercase "n"
      expect(buttons[0].text()).toBe('Define a new cohort')
    })

    it('should use translation for vocabulary button text', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.landing__actions .v-btn')
      // The mock returns the fallback value; new casing: lowercase "t"
      expect(buttons[1].text()).toBe('Search the vocabulary')
    })

    it('should use translation for documentation title', () => {
      const wrapper = mountComponent()
      const title = wrapper.find('.landing__feature--docs .landing__feature-title')
      // The mock returns the fallback value
      expect(title.text()).toBe('Documentation')
    })
  })

  describe('Layout Sections', () => {
    it('should have all main sections present', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.landing__title').exists()).toBe(true)
      expect(wrapper.find('.landing__description').exists()).toBe(true)
      expect(wrapper.find('.landing__feature--docs').exists()).toBe(true)
      expect(wrapper.find('.landing__actions').exists()).toBe(true)
      expect(wrapper.find('.landing__illustration').exists()).toBe(true)
      expect(wrapper.find('.landing__features').exists()).toBe(true)
    })

    it('should render hero-content children in correct order', () => {
      const wrapper = mountComponent()
      const content = wrapper.find('.landing__hero-content')
      const children = Array.from(content.element.children)

      const classNames = children.map(child => {
        for (const className of child.classList) {
          if (className.startsWith('landing__')) {
            return className
          }
        }
        return ''
      })

      expect(classNames[0]).toBe('landing__eyebrow-row')
      expect(classNames[1]).toBe('landing__title')
      expect(classNames[2]).toBe('landing__description')
      expect(classNames[3]).toBe('landing__actions')
    })
  })
})
