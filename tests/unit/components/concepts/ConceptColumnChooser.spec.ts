import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptColumnChooser from '@/components/concepts/ConceptColumnChooser.vue'
import { useConceptTablePreferencesStore } from '@/stores/concept-table-preferences'

const vuetify = createVuetify({ components, directives })

describe('ConceptColumnChooser', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates the shared column preference when an optional column is toggled', async () => {
    const wrapper = mount(ConceptColumnChooser, { global: { plugins: [vuetify] } })
    await wrapper.find('[data-testid="concept-search-columns"]').trigger('click')
    await wrapper.vm.$nextTick()

    const personCount = wrapper.findAllComponents({ name: 'VCheckboxBtn' })
      .find(checkbox => checkbox.props('label') === 'Person Count')!
    await personCount.vm.$emit('update:modelValue', true)

    expect(useConceptTablePreferencesStore().visibleColumnKeys).toContain('personCount')
  })
})
