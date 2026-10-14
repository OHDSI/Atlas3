import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ComparisonVennDiagram from '@/components/concepts/ComparisonVennDiagram.vue'
import { tr } from '../../../helpers/i18n-mock'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

describe('ComparisonVennDiagram', () => {
  it('renders the total concept count through the {count} placeholder', () => {
    const wrapper = mount(ComparisonVennDiagram, {
      props: { leftOnly: 2, rightOnly: 3, both: 5, leftLabel: 'A', rightLabel: 'B' },
    })
    expect(wrapper.text()).toContain(
      tr('cs.browser.compare.vennDiagramTotalAmountConcepts', { count: 10 })
    )
  })
})
