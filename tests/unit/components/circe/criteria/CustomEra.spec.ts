import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import CustomEra from '@/components/circe/criteria/CustomEra.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type CustomEraModel = Record<string, any>

function mountCustomEraEditor() {
  const criteria = reactive({}) as { CustomEra?: CustomEraModel }
  const wrapper = mountComponent(CustomEra, {
    props: {
      criteria,
      conceptSets: [{ id: 42, name: 'Custom era concept set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountCustomEraEditor>['wrapper'], selector: string) {
  await wrapper.get(selector).trigger('click')
  await nextTick()
}

describe('CustomEra', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the fixed criteria-list and gap-days sections', async () => {
    const { wrapper } = mountCustomEraEditor()

    expect(wrapper.get('.custom-era-editor__section-title').text()).toContain('Criteria List')
    expect(wrapper.get('.custom-era-editor__gap-days-chip').text()).toContain('0 days')
    expect(wrapper.text()).toContain('a custom era using')
    expect(wrapper.text()).toContain('gap of:')
    expect(wrapper.text()).toContain('Additional Attributes')
    expect(wrapper.text()).toContain('Date Adjustment')
    expect(wrapper.text()).toContain('Start Date')
    expect(wrapper.text()).toContain('End Date')
    expect(wrapper.text()).toContain('Nested Criteria')
  })

  it('adds nested criteria and optional attributes separately', async () => {
    const { wrapper, criteria } = mountCustomEraEditor()

    await openMenu(wrapper, '.custom-era-editor__add-criteria-button')
    await selectMenuItem(wrapper, 'Condition Era')

    expect(criteria.CustomEra?.CriteriaList).toHaveLength(1)

    await openMenu(wrapper, '.custom-era-editor__add-attribute-button')
    await selectMenuItem(wrapper, 'First Era')

    expect(criteria.CustomEra?.First).toBe(true)
    expect(wrapper.text()).toContain('First Era')

    await removeActiveAttribute(wrapper)
    expect(criteria.CustomEra?.First).toBeUndefined()

    await openMenu(wrapper, '.custom-era-editor__add-attribute-button')
    await selectMenuItem(wrapper, 'Date Adjustment')
    expect(wrapper.findComponent({ name: 'DateAdjustment' }).exists()).toBe(true)

    await openMenu(wrapper, '.custom-era-editor__add-attribute-button')
    await selectMenuItem(wrapper, 'Nested Criteria')
    expect(wrapper.findComponent({ name: 'CriteriaGroup' }).exists()).toBe(true)

    await wrapper.get('.custom-era-editor__gap-days-chip').trigger('click')
    await nextTick()

    const gapDaysInput = wrapper.get('.custom-era-editor__gap-days-popover input')
    await gapDaysInput.setValue('7')
    await nextTick()
    expect(criteria.CustomEra?.GapDays).toBe(7)
    expect(wrapper.get('.custom-era-editor__gap-days-chip').text()).toContain('7 days')
  })

  it('renders optional start and end date attributes when present', async () => {
    const { wrapper, criteria } = mountCustomEraEditor()

    criteria.CustomEra = {
      StartDate: { Value: '2020-01-01', Op: 'gte', Extent: undefined },
      EndDate: { Value: '2020-12-31', Op: 'lte', Extent: undefined },
    }

    await nextTick()

    expect(wrapper.text()).toContain('Start Date')
    expect(wrapper.text()).toContain('End Date')
    expect(wrapper.findAllComponents({ name: 'DateRange' })).toHaveLength(2)
  })
})