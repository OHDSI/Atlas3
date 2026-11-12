import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import ConceptDetailDrawer from '@/components/concepts/detail/ConceptDetailDrawer.vue'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { InlineAtlasSideSheetStub } from '../../../../helpers/component-wrapper'

const vuetify = createVuetify({ components, directives })

const ContentStub = defineComponent({
  name: 'ConceptDetailContent',
  props: { sourceKey: { type: String, default: '' }, conceptId: { type: Number, default: 0 } },
  emits: ['navigate'],
  template: '<div data-testid="detail-content" />',
})

function mountDrawer() {
  return mount(ConceptDetailDrawer, {
    global: {
      plugins: [vuetify],
      stubs: { AtlasSideSheet: InlineAtlasSideSheetStub, ConceptDetailContent: ContentStub },
    },
  })
}

describe('ConceptDetailDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders nothing while the store is closed', () => {
    const wrapper = mountDrawer()
    expect(wrapper.getComponent(InlineAtlasSideSheetStub).props('modelValue')).toBe(false)
    expect(wrapper.find('[data-testid="detail-content"]').exists()).toBe(false)
  })

  it('opens a labelled sheet showing the selected concept', async () => {
    const store = useConceptDetailDrawerStore()
    store.open('SRC1', 316139)
    const wrapper = mountDrawer()

    const sheet = wrapper.getComponent(InlineAtlasSideSheetStub)
    expect(sheet.props('modelValue')).toBe(true)
    expect(sheet.props('contentClass')).toBe('concept-detail-drawer')
    expect(sheet.props('ariaLabel')).toBeTruthy()
    expect(wrapper.getComponent(ContentStub).props()).toMatchObject({ sourceKey: 'SRC1', conceptId: 316139 })
  })

  it('closes the store from the close button', async () => {
    const store = useConceptDetailDrawerStore()
    store.open('SRC1', 1)
    const wrapper = mountDrawer()
    await wrapper.get('[data-testid="concept-drawer-close"]').trigger('click')
    expect(store.isOpen).toBe(false)
  })

  it('closes the store when the sheet is dismissed (Esc/scrim)', async () => {
    const store = useConceptDetailDrawerStore()
    store.open('SRC1', 1)
    const wrapper = mountDrawer()
    wrapper.getComponent(InlineAtlasSideSheetStub).vm.$emit('update:modelValue', false)
    expect(store.isOpen).toBe(false)
  })

  it('ignores an open request from the sheet', () => {
    const store = useConceptDetailDrawerStore()
    const wrapper = mountDrawer()
    wrapper.getComponent(InlineAtlasSideSheetStub).vm.$emit('update:modelValue', true)
    expect(store.isOpen).toBe(false)
  })

  it('navigates to a related concept in the same source', async () => {
    const store = useConceptDetailDrawerStore()
    store.open('SRC1', 1)
    const wrapper = mountDrawer()
    wrapper.getComponent(ContentStub).vm.$emit('navigate', 2)
    expect(store.conceptId).toBe(2)
    expect(store.sourceKey).toBe('SRC1')
    expect(store.isOpen).toBe(true)
  })

  it('ignores navigation when no source is set', () => {
    const store = useConceptDetailDrawerStore()
    store.open('SRC1', 1)
    const wrapper = mountDrawer()
    const content = wrapper.getComponent(ContentStub)
    store.sourceKey = ''
    content.vm.$emit('navigate', 2)
    expect(store.conceptId).toBe(1)
  })
})