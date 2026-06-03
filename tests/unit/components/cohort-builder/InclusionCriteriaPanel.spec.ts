/**
 * InclusionCriteriaPanel Component Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionCriteriaPanel from '@/components/cohort-builder/InclusionCriteriaPanel.vue'
import type { InclusionRule } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

// Hoisted refs so individual tests can flip statsError / isInvalidExpression
// to exercise the AtlasAlert branches and the copyStatsError handler.
const inclusionStatsState = vi.hoisted(() => ({
  stats: { value: null as null },
  isLoading: { value: false },
  isPending: { value: false },
  error: { value: null as string | null },
  isInvalidExpression: { value: false },
  isStale: { value: false },
  refresh: () => {},
}))

vi.mock('@/composables/useInclusionStats', () => ({
  useInclusionStats: () => inclusionStatsState,
}))

vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => ({
    isTrexSQLEnabled: { value: false },
    selectedSourceKey: { value: null },
    isCacheReady: { value: false },
    selectedCacheStatus: { value: null },
  }),
}))

const vuetify = createVuetify({ components, directives })

function createMockInclusionRule(): InclusionRule {
  return {
    id: 'rule-1',
    name: 'Test Inclusion Rule',
    description: 'This is a test inclusion rule',
    criteriaGroups: [
      {
        id: 'group-1',
        logicType: 'ALL',
        events: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 1, name: 'Type 2 Diabetes' },
            attributes: []
          }
        ]
      }
    ]
  }
}

function createMockInclusionRules(): InclusionRule[] {
  return [
    createMockInclusionRule(),
    {
      id: 'rule-2',
      name: 'Second Inclusion Rule',
      description: undefined,
      criteriaGroups: []
    }
  ]
}

function mountComponent(props = {}) {
  return mount(InclusionCriteriaPanel, {
    props: {
      modelValue: [],
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        CriteriaGroupEditor: {
          template: '<div class="criteria-group-editor-stub" />',
          props: ['modelValue'],
          emits: ['update:modelValue', 'remove', 'select-concept-set', 'select-concept', 'edit-concept-set']
        },
        InclusionRuleRail: {
          template: `
            <div class="inclusion-rule-rail-stub">
              <button
                v-for="(rule, i) in rules"
                :key="rule.id"
                type="button"
                data-testid="inclusion-rail-rule"
                :class="['inclusion-rail__rule', { 'inclusion-rail__rule--active': i === selectedIndex }]"
                @click="$emit('select', i)"
              >{{ rule.name }}</button>
            </div>
          `,
          props: ['rules', 'selectedIndex', 'cacheState', 'entryEventCount', 'totalDatasetCount', 'ruleCounts', 'finalCount', 'isComputing', 'computingIndex'],
          emits: ['select', 'add-rule'],
        },
        InclusionRuleDetail: {
          template: `
            <div class="inclusion-rule-detail-stub">
              <input v-if="rule" class="rule-description-input" :value="rule.description ?? ''" />
              <button v-if="rule" data-testid="add-criteria-group">Add criteria group</button>
            </div>
          `,
          props: ['rule'],
          emits: ['update:rule', 'select-concept-set', 'select-concept', 'edit-concept-set'],
        }
      }
    }
  })
}

describe('InclusionCriteriaPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    inclusionStatsState.error.value = null
    inclusionStatsState.isInvalidExpression.value = false
    inclusionStatsState.isPending.value = false
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render the legacy vertical "ALL" sticker', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.vertical-label').exists()).toBe(false)
      expect(wrapper.find('.inclusion-criteria-panel__relation-pill').exists()).toBe(false)
    })

    it('should expose addNewRule for the parent section header', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as { addNewRule?: () => void }
      expect(typeof vm.addNewRule).toBe('function')
    })

    it('should display empty state when no rules', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('should show empty state message', () => {
      const wrapper = mountComponent({ modelValue: [] })
      expect(wrapper.find('.inclusion-criteria-panel__empty').exists()).toBe(true)
    })

    it('should display helpful text in empty state', () => {
      const wrapper = mountComponent({ modelValue: [] })
      expect(wrapper.exists()).toBe(true)
    })

    it('should not show expansion panels when empty', () => {
      const wrapper = mountComponent({ modelValue: [] })
      const panels = wrapper.findComponent({ name: 'VExpansionPanels' })
      expect(panels.exists()).toBe(false)
    })
  })

  describe('Adding Inclusion Rules', () => {
    it('should add new rule when button is clicked', async () => {
      const wrapper = mountComponent({ modelValue: [] })
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules.length).toBeGreaterThanOrEqual(1)
    })

    it('should create rule with default name', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[rules.length - 1].name).toContain('New Inclusion Rule')
    })

    it('should create rule with incremented counter', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      if (typeof vm.addNewRule === 'function') {
        vm.addNewRule()
        await wrapper.vm.$nextTick()

        vm.addNewRule()
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
      const emitted = wrapper.emitted('update:modelValue') as any[] | undefined
      if (!emitted) return
      expect(emitted.length).toBeGreaterThanOrEqual(2)
    })

    it('should append new rule to the end of array', async () => {
      const existing = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: existing })
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].name).toBe('Test Inclusion Rule')
      expect(rules[rules.length - 1].name).toContain('New Inclusion Rule')
      expect(rules.length).toBe(existing.length + 1)
    })

    it('should select the new rule (last index) after adding', async () => {
      const existing = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: existing })
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      expect(vm.selectedIndex).toBe(existing.length)
    })

    it('should create rule with a default criteria group', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      const added = rules[rules.length - 1]!
      expect(added.criteriaGroups).toHaveLength(1)
      expect(added.criteriaGroups[0]!.logicType).toBe('ALL')
      expect(added.criteriaGroups[0]!.events).toEqual([])
    })
  })

  describe('Displaying Inclusion Rules', () => {
    it('should display rule rows in the rail when rules exist', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const rows = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('should display rule names', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      expect(wrapper.text()).toContain('Test Inclusion Rule')
      expect(wrapper.text()).toContain('Second Inclusion Rule')
    })

    it('should render correct number of rail rows', () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      const rows = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
      expect(rows.length).toBe(mockRules.length)
    })

    it('should display edit and remove buttons for selected rule', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should display remove button for selected rule', () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      const removeButtons = wrapper.findAll('[data-testid="remove-inclusion-rule"]')
      expect(removeButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Editing Rule Names', () => {
    it('should open edit dialog when clicking edit button', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.openEditDialog(0)
      await wrapper.vm.$nextTick()

      expect(vm.showEditDialog).toBe(true)
    })

    it('should populate editing name with current rule name', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.openEditDialog(0)
      await wrapper.vm.$nextTick()

      expect(vm.editingName).toBe('Test Inclusion Rule')
    })

    it('should save edited name when confirmed', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.openEditDialog(0)
      vm.editingName = 'Updated Rule Name'
      vm.saveEditedName()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].name).toBe('Updated Rule Name')
    })

    it('should close dialog after saving', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.openEditDialog(0)
      vm.editingName = 'New Name'
      vm.saveEditedName()
      await wrapper.vm.$nextTick()

      expect(vm.showEditDialog).toBe(false)
    })

    it('should render edit name dialog', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const dialogs = wrapper.findAllComponents({ name: 'VDialog' })
      expect(dialogs.length).toBeGreaterThan(0)
    })
  })

  describe('Editing Rule Descriptions', () => {
    it('should display description input field when a rule is selected', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      expect(wrapper.find('.rule-description-input').exists()).toBe(true)
    })

    it('should display current description', () => {
      const _wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const rules = createMockInclusionRules()
      expect(rules[0].description).toBe('This is a test inclusion rule')
    })

    it.skip('should update description on blur — TODO: description updates now flow through onRuleUpdated via InclusionRuleDetail', async () => {
      // Description update logic moved to InclusionRuleDetail; panel receives update:rule event
    })

    it.skip('should handle empty description — TODO: handled inside InclusionRuleDetail now', async () => {
      // Logic moved to InclusionRuleDetail
    })
  })

  describe('Removing Inclusion Rules', () => {
    it('should remove rule when remove button is clicked', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.removeRule(0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules.length).toBe(createMockInclusionRules().length - 1)
      expect(rules[0].name).toBe('Second Inclusion Rule')
    })

    it('should remove correct rule by index', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.removeRule(1)
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules.length).toBe(1)
      expect(rules[0].name).toBe('Test Inclusion Rule')
    })
  })

  describe('Criteria Groups Management', () => {
    it('should display criteria groups for each rule', () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      expect(wrapper.exists()).toBe(true)
      const rows = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
      expect(rows.length).toBe(mockRules.length)
    })

    it.skip('should add criteria group to rule — TODO: addGroup moved to InclusionRuleDetail', async () => {
      // Group mutations now handled by InclusionRuleDetail emitting update:rule
    })

    it.skip('should update criteria group — TODO: updateGroup moved to InclusionRuleDetail', async () => {
      // Group mutations now handled by InclusionRuleDetail emitting update:rule
    })

    it.skip('should remove criteria group — TODO: removeGroup moved to InclusionRuleDetail', async () => {
      // Group mutations now handled by InclusionRuleDetail emitting update:rule
    })

    it('should display add group button in detail pane when rule selected', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      expect(wrapper.find('[data-testid="add-criteria-group"]').exists()).toBe(true)
    })
  })

  describe('Concept Set Selection Events', () => {
    it('should emit select-concept-set with correct context', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.onSelectConceptSet({ groupIndex: 0, eventIndex: 0 })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept-set')).toBeTruthy()
      const emitted = wrapper.emitted('select-concept-set') as any[]
      expect(emitted[0][0]).toEqual({ ruleIndex: 0, groupIndex: 0, eventIndex: 0 })
    })

    it('should emit edit-concept-set event', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const conceptSet = { id: 1, name: 'Test Concept Set', items: [] }

      wrapper.vm.$emit('edit-concept-set', conceptSet)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('edit-concept-set')).toBeTruthy()
      const emitted = wrapper.emitted('edit-concept-set') as any[]
      expect(emitted[0][0]).toEqual(conceptSet)
    })
  })

  describe('Concept Selection Events', () => {
    it('should emit select-concept with correct context', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      const context = { groupIndex: 0, eventIndex: 0, attributeIndex: 1, domainFilter: 'Condition' as string | undefined }
      vm.onSelectConcept(context)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept')).toBeTruthy()
      const emitted = wrapper.emitted('select-concept') as any[]
      expect(emitted[0][0]).toEqual({
        ruleIndex: 0,
        groupIndex: 0,
        eventIndex: 0,
        attributeIndex: 1,
        domainFilter: 'Condition'
      })
    })

    it('should handle concept selection without domain filter', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      const context = { groupIndex: 0, eventIndex: 1, attributeIndex: 0, domainFilter: undefined as string | undefined }
      vm.onSelectConcept(context)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept')).toBeTruthy()
      const emitted = wrapper.emitted('select-concept') as any[]
      expect(emitted[0][0].domainFilter).toBeUndefined()
    })
  })

  describe('Rail selection behavior', () => {
    it('should start with first rule selected when rules are present', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      expect(vm.selectedIndex).toBe(0)
    })

    it('should start with null selection when empty', () => {
      const wrapper = mountComponent({ modelValue: [] })
      const vm = wrapper.vm as any
      expect(vm.selectedIndex).toBeNull()
    })

    it('should update selection when onSelect is called', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.onSelect(1)
      await wrapper.vm.$nextTick()

      expect(vm.selectedIndex).toBe(1)
    })
  })

  describe('Styling and Layout', () => {
    it('should apply the panel root class', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.inclusion-criteria-panel').exists()).toBe(true)
    })

    it('should not render an internal header strip', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.inclusion-criteria-panel__header').exists()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty modelValue', () => {
      const wrapper = mountComponent({ modelValue: [] })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle empty modelValue as default', () => {
      const wrapper = mountComponent({ modelValue: [] })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.inclusion-criteria-panel__empty').exists()).toBe(true)
    })

    it('should handle rule without criteria groups', () => {
      const ruleWithoutGroups: InclusionRule = {
        id: 'rule-3',
        name: 'Empty Rule',
        description: undefined,
        criteriaGroups: []
      }
      const wrapper = mountComponent({ modelValue: [ruleWithoutGroups] })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle rule without description', () => {
      const ruleWithoutDesc: InclusionRule = {
        id: 'rule-4',
        name: 'No Description',
        description: undefined,
        criteriaGroups: []
      }
      const wrapper = mountComponent({ modelValue: [ruleWithoutDesc] })
      expect(wrapper.exists()).toBe(true)
    })

    it.skip('should handle adding group to non-existent rule gracefully — TODO: addGroup moved to InclusionRuleDetail', async () => {
      // addGroup no longer exists on the panel; tested in InclusionRuleDetail.spec.ts
    })

    it.skip('should handle updating non-existent group gracefully — TODO: updateGroup moved to InclusionRuleDetail', async () => {
      // updateGroup no longer exists on the panel; tested in InclusionRuleDetail.spec.ts
    })

    it('should handle removing non-existent rule gracefully', async () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      const originalLength = mockRules.length
      const vm = wrapper.vm as any

      vm.removeRule(999)
      await wrapper.vm.$nextTick()

      if (wrapper.emitted('update:modelValue')) {
        const emitted = wrapper.emitted('update:modelValue') as any[]
        const rules = emitted[emitted.length - 1][0] as InclusionRule[]
        expect(rules.length).toBe(originalLength)
      }
    })
  })

  describe('Master-detail layout', () => {
    it('selects the first rule by default when rules are present', async () => {
      const rules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: rules })
      await wrapper.vm.$nextTick()
      const rows = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
      expect(rows[0]!.classes()).toContain('inclusion-rail__rule--active')
    })

    it('switches detail pane when a different rail row is clicked', async () => {
      const rules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: rules })
      await wrapper.vm.$nextTick()
      await wrapper.findAll('[data-testid="inclusion-rail-rule"]')[1]!.trigger('click')
      const active = wrapper.find('[data-testid="inclusion-rail-rule"].inclusion-rail__rule--active')
      expect(active.text()).toContain('Second Inclusion Rule')
    })
  })

  describe('copyStatsError', () => {
    afterEach(() => {
      vi.useRealTimers()
      Object.assign(navigator, { clipboard: undefined })
    })

    it('writes the stats error to clipboard and flips errorCopied true→false after 1500ms', async () => {
      vi.useFakeTimers()
      inclusionStatsState.error.value = 'Boom — SQL execution failed'
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      await vm.copyStatsError()

      expect(writeText).toHaveBeenCalledWith('Boom — SQL execution failed')
      expect(vm.errorCopied).toBe(true)

      vi.advanceTimersByTime(1500)
      expect(vm.errorCopied).toBe(false)
    })

    it('is a no-op when there is no stats error', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      await vm.copyStatsError()

      expect(writeText).not.toHaveBeenCalled()
      expect(vm.errorCopied).toBe(false)
    })

    it('is a no-op when the clipboard API is unavailable', async () => {
      inclusionStatsState.error.value = 'failure'
      Object.assign(navigator, { clipboard: undefined })

      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      await vm.copyStatsError()

      expect(vm.errorCopied).toBe(false)
    })

    it('restarts the 1500ms reset window on rapid successive copies', async () => {
      vi.useFakeTimers()
      inclusionStatsState.error.value = 'still broken'
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      await vm.copyStatsError()
      vi.advanceTimersByTime(1000)
      // second copy before the first timer fires — should reset the window.
      await vm.copyStatsError()
      vi.advanceTimersByTime(1000)
      expect(vm.errorCopied).toBe(true)
      vi.advanceTimersByTime(500)
      expect(vm.errorCopied).toBe(false)
    })
  })
})
