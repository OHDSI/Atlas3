import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import ConceptDetailHeader from '@/components/concepts/detail/ConceptDetailHeader.vue'
import type { Concept } from '@/models/concept-set.types'
import { tr } from '../../../helpers/i18n-mock'

const concept: Concept = {
  conceptId: 201826,
  conceptName: 'Type 2 diabetes mellitus',
  conceptCode: '44054006',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

describe('ConceptDetailHeader', () => {
  beforeEach(() => {
    // Pinia is required by useI18n() inside the component tree.
    setActivePinia(createPinia())
  })

  it('renders concept name, vocabulary, ID, domain, class as chips', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
    expect(wrapper.text()).toContain('SNOMED')
    expect(wrapper.text()).toContain('201826')
    expect(wrapper.text()).toContain('Condition')
    expect(wrapper.text()).toContain('Clinical Finding')
    expect(wrapper.find('[data-testid="add-to-concept-set"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="copy-concept-id"]').exists()).toBe(true)
  })

  it('emits add-to-concept-set when button clicked', async () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept },
      global: { plugins: [vuetify] },
    })

    await wrapper.find('[data-testid="add-to-concept-set"]').trigger('click')
    expect(wrapper.emitted('add-to-concept-set')).toEqual([[concept]])
  })

  it('shows non-standard chip when standardConcept is null', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept: { ...concept, standardConcept: null } },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain(tr('cs.manager.concept.nonStandard'))
  })

  it('labels classification concepts', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept: { ...concept, standardConcept: 'C' } },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain(tr('cs.manager.concept.classification'))
  })

  describe('back button', () => {
    function mountWithRouter(props: Record<string, unknown> = {}) {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', component: { template: '<div />' } },
          { path: '/concepts', component: { template: '<div />' } },
        ],
      })
      const back = vi.spyOn(router, 'back').mockImplementation(() => undefined)
      const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
      const wrapper = mount(ConceptDetailHeader, {
        props: { concept, ...props },
        global: { plugins: [createVuetify({ components, directives }), router] },
      })
      return { wrapper, back, push }
    }

    let historySpy: { mockRestore: () => void } | undefined
    afterEach(() => historySpy?.mockRestore())

    it('uses the host onBack handler instead of routing or closing the drawer', async () => {
      const onBack = vi.fn()
      const { wrapper, back, push } = mountWithRouter({ onBack })
      const drawer = useConceptDetailDrawerStore()
      drawer.open('OHDSI', 1)
      const close = vi.spyOn(drawer, 'close')

      await wrapper.find('[data-testid="concept-detail-back"]').trigger('click')

      expect(onBack).toHaveBeenCalledTimes(1)
      expect(close).not.toHaveBeenCalled()
      expect(back).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
    })

    it('closes the drawer when shown inside it', async () => {
      const { wrapper, back } = mountWithRouter()
      const drawer = useConceptDetailDrawerStore()
      drawer.open('OHDSI', 1)

      await wrapper.find('[data-testid="concept-detail-back"]').trigger('click')

      expect(drawer.isOpen).toBe(false)
      expect(back).not.toHaveBeenCalled()
    })

    it('goes back in history when there is somewhere to go back to', async () => {
      historySpy = vi.spyOn(window.history, 'length', 'get').mockReturnValue(3)
      const { wrapper, back, push } = mountWithRouter()

      await wrapper.find('[data-testid="concept-detail-back"]').trigger('click')

      expect(back).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
    })

    it('falls back to the concepts page when opened without history', async () => {
      historySpy = vi.spyOn(window.history, 'length', 'get').mockReturnValue(1)
      const { wrapper, back, push } = mountWithRouter()

      await wrapper.find('[data-testid="concept-detail-back"]').trigger('click')

      expect(back).not.toHaveBeenCalled()
      expect(push).toHaveBeenCalledWith('/concepts')
    })
  })

  describe('copy ID', () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

    afterEach(() => {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
      else Reflect.deleteProperty(navigator, 'clipboard')
    })

    it('copies the concept ID to the clipboard and emits copy-id', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      const wrapper = mount(ConceptDetailHeader, {
        props: { concept },
        global: { plugins: [createVuetify({ components, directives })] },
      })

      await wrapper.find('[data-testid="copy-concept-id"]').trigger('click')
      await flushPromises()

      expect(writeText).toHaveBeenCalledWith('201826')
      expect(wrapper.emitted('copy-id')).toEqual([[201826]])
    })

    it('still emits copy-id when the clipboard API is unavailable', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
      const wrapper = mount(ConceptDetailHeader, {
        props: { concept },
        global: { plugins: [createVuetify({ components, directives })] },
      })

      await wrapper.find('[data-testid="copy-concept-id"]').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('copy-id')).toEqual([[201826]])
    })
  })

  it('shows a progress bar along its bottom edge only while loading', async () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.find('[data-testid="concept-detail-header-progress"]').exists()).toBe(false)

    await wrapper.setProps({ loading: true })
    expect(wrapper.find('[data-testid="concept-detail-header-progress"]').exists()).toBe(true)
  })

  it('dims a stale concept without dimming the progress bar or disabling back', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept, loading: true, stale: true },
      global: { plugins: [vuetify] },
    })
    const header = wrapper.find('[data-testid="concept-detail-header"]')
    expect(header.classes()).toContain('concept-detail-header--stale')
    // The dimming targets the title and actions, never the header itself.
    expect(header.classes()).not.toContain('is-stale')
    expect(wrapper.find('[data-testid="concept-detail-back"]').attributes('disabled')).toBeUndefined()
  })
})
