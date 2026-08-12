import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetSelection from '@/components/cohort-editor/input/ConceptSetSelection.vue'
import type { ConceptSetSelectionTarget } from '@/components/cohort-editor/criteria/criteria-editor.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

describe('ConceptSetSelection', () => {
  it('writes the selected concept set id back through the targetRef into the original criteria field', async () => {
    let capturedTargetRef: ConceptSetSelectionTarget['targetRef'] | null = null

    const wrapper = mount(
      defineComponent({
        components: { ConceptSetSelection },
        setup() {
          const criteria = reactive({
            GenderCS: {
              CodesetId: null as number | null,
              IsExclusion: false,
            },
          })
          const conceptSets = [{ id: 7, name: 'Coronary Artery Bypass' }]
          const targetRef = ref<number | null | undefined>(null)

          function handleSelect(target: ConceptSetSelectionTarget | undefined) {
            if (target?.targetRef) {
              capturedTargetRef = target.targetRef
              target.targetRef.value = 7
            }
          }

          return {
            criteria,
            conceptSets,
            handleSelect,
            targetRef,
          }
        },
        template: `
          <ConceptSetSelection
            :model-value="criteria.GenderCS"
            :concept-sets="conceptSets"
            @select="handleSelect"
          />
        `,
      }),
      {
        global: {
          plugins: [vuetify],
        },
      }
    )

    await wrapper.find('[data-testid="concept-set-picker"]').trigger('click')
    await nextTick()

    expect(wrapper.vm.criteria.GenderCS.CodesetId).toBe(7)
    expect(capturedTargetRef?.value).toBe(7)
  })
})