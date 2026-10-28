import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetJsonDialog from '@/components/concepts/ConceptSetJsonDialog.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })
const expression = JSON.stringify({
  items: [{
    concept: {
      CONCEPT_ID: 313217,
      CONCEPT_NAME: 'Atrial fibrillation',
      CONCEPT_CODE: '49436004',
      DOMAIN_ID: 'Condition',
      VOCABULARY_ID: 'SNOMED',
      CONCEPT_CLASS_ID: 'Clinical Finding',
      STANDARD_CONCEPT: 'S',
      INVALID_REASON: null,
    },
    isExcluded: false,
    includeDescendants: true,
    includeMapped: false,
  }],
}, null, 2)

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ConceptSetJsonDialog, {
    props: {
      modelValue: true,
      json: expression,
      filename: 'concept-set.json',
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="actions" /></div>',
        },
      },
    },
  })
}

describe('ConceptSetJsonDialog', () => {
  it('applies the parsed expression items only after the user confirms', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-testid="concept-set-json-apply"]').trigger('click')

    expect(wrapper.emitted('apply')).toEqual([[[
      expect.objectContaining({
        conceptId: 313217,
        includeDescendants: true,
      }),
    ]]])
  })

  it('prevents malformed JSON from being applied', async () => {
    const wrapper = mountDialog()

    await wrapper.find('textarea').setValue('{ invalid')

    expect(wrapper.find('[data-testid="concept-set-json-error"]').exists()).toBe(true)
    expect(wrapper.getComponent('[data-testid="concept-set-json-apply"]').props('disabled')).toBe(true)
    await wrapper.get('[data-testid="concept-set-json-apply"]').trigger('click')
    expect(wrapper.emitted('apply')).toBeFalsy()
  })

  it('prevents changes while previewing a historical version', async () => {
    const wrapper = mountDialog({ canApply: false })

    expect(wrapper.getComponent('[data-testid="concept-set-json-apply"]').props('disabled')).toBe(true)
    await wrapper.get('[data-testid="concept-set-json-apply"]').trigger('click')
    expect(wrapper.emitted('apply')).toBeFalsy()
  })

  it('copies the edited JSON expression to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const wrapper = mountDialog()
    const edited = expression.replace('Atrial fibrillation', 'Edited expression')

    await wrapper.find('textarea').setValue(edited)
    await wrapper.get('[data-testid="concept-set-json-copy"]').trigger('click')

    expect(writeText).toHaveBeenCalledWith(edited)
  })
})
