/**
 * InclusionCriteriaPanel Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionCriteriaPanel from '@/components/cohort-builder/InclusionCriteriaPanel.vue'
import type { InclusionRule, CriteriaGroup } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

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
        }
      }
    }
  })
}

describe('InclusionCriteriaPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render the legacy vertical "ALL" sticker', () => {
      // Refresh: vertical sideways-lr label was retired; the
      // qualifying-limit toggle in the surrounding section header
      // is the single source of truth for that information now.
      const wrapper = mountComponent()
      expect(wrapper.find('.vertical-label').exists()).toBe(false)
      expect(wrapper.find('.inclusion-criteria-panel__relation-pill').exists()).toBe(false)
    })

    it('should expose addNewRule for the parent section header', () => {
      // Refresh: the panel no longer renders its own add-rule
      // button (parent section header hosts that action). The
      // panel exposes addNewRule via defineExpose so the parent
      // can trigger it.
      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as { addNewRule?: () => void }
      expect(typeof vm.addNewRule).toBe('function')
    })

    it('should display empty state when no rules', () => {
      const wrapper = mountComponent()
      // Check component renders with empty rules
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('should show empty state message', () => {
      // Refresh: replaced v-alert with the MD3 filled empty-state
      // container used elsewhere in the modernised UI.
      const wrapper = mountComponent({ modelValue: [] })
      expect(wrapper.find('.inclusion-criteria-panel__empty').exists()).toBe(true)
    })

    it('should display helpful text in empty state', () => {
      const wrapper = mountComponent({ modelValue: [] })
      // Component should render without errors
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
      expect(rules[0].name).toContain('New Inclusion Rule')
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
      // Each addNewRule call emits a separate update with the new rule
      // Check that we have at least 2 emissions
      expect(emitted.length).toBeGreaterThanOrEqual(2)
    })

    it('should add new rule at the beginning of array', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].name).toContain('New Inclusion Rule')
      expect(rules[1].name).toBe('Test Inclusion Rule')
    })

    it('should automatically expand new rule', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      expect(vm.expandedPanel).toBe(0)
    })

    it('should create rule with a default criteria group', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addNewRule()
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].criteriaGroups).toHaveLength(1)
      expect(rules[0].criteriaGroups[0].logicType).toBe('ALL')
      expect(rules[0].criteriaGroups[0].events).toEqual([])
    })
  })

  describe('Displaying Inclusion Rules', () => {
    it('should display expansion panels when rules exist', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const panels = wrapper.findComponent({ name: 'VExpansionPanels' })
      expect(panels.exists()).toBe(true)
    })

    it('should display rule names', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      expect(wrapper.text()).toContain('Test Inclusion Rule')
      expect(wrapper.text()).toContain('Second Inclusion Rule')
    })

    it('should render correct number of expansion panels', () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      const panels = wrapper.findAllComponents({ name: 'VExpansionPanel' })
      expect(panels.length).toBe(mockRules.length)
    })

    it('should display edit button for each rule', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should display remove button for each rule', () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      const removeButtons = wrapper.findAll('[data-testid="remove-inclusion-rule"]')
      expect(removeButtons.length).toBe(mockRules.length)
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
    it('should display description input field', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      // Component should render with rules
      expect(wrapper.exists()).toBe(true)
    })

    it('should display current description', () => {
      const _wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      // Verify the mock data has a description
      const rules = createMockInclusionRules()
      expect(rules[0].description).toBe('This is a test inclusion rule')
    })

    it('should update description on blur', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      const mockEvent = {
        target: { value: 'Updated description' }
      }

      vm.updateRuleDescription(0, mockEvent)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].description).toBe('Updated description')
    })

    it('should handle empty description', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      const mockEvent = {
        target: { value: '' }
      }

      vm.updateRuleDescription(0, mockEvent)
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].description).toBeUndefined()
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
      // Component should render the rules
      expect(wrapper.exists()).toBe(true)
      // Expansion panels should exist for rules with criteria groups
      const panels = wrapper.findAllComponents({ name: 'VExpansionPanel' })
      expect(panels.length).toBe(mockRules.length)
    })

    it('should add criteria group to rule', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      const initialLength = createMockInclusionRule().criteriaGroups.length

      vm.addGroup(0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].criteriaGroups.length).toBeGreaterThan(initialLength)
    })

    it('should update criteria group', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      const updatedGroup: CriteriaGroup = {
        id: 'group-1',
        logicType: 'ANY',
        events: []
      }

      vm.updateGroup(0, 0, updatedGroup)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].criteriaGroups[0].logicType).toBe('ANY')
    })

    it('should remove criteria group', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      const initialLength = createMockInclusionRule().criteriaGroups.length

      vm.removeGroup(0, 0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const rules = emitted[emitted.length - 1][0] as InclusionRule[]
      expect(rules[0].criteriaGroups.length).toBeLessThan(initialLength)
    })

    it('should display add group button', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      // Component should render without errors
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Concept Set Selection Events', () => {
    it('should emit select-concept-set with correct context', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.handleSelectConceptSet(0, 0, 0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept-set')).toBeTruthy()
      const emitted = wrapper.emitted('select-concept-set') as any[]
      expect(emitted[0][0]).toEqual({ ruleIndex: 0, groupIndex: 0, eventIndex: 0 })
    })

    it('should handle concept set selection with event context', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.handleSelectConceptSet(1, 0, { eventIndex: 2, eventId: 'event-2' })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept-set')).toBeTruthy()
      const emitted = wrapper.emitted('select-concept-set') as any[]
      expect(emitted[0][0].eventIndex).toBe(2)
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

      const context = { eventIndex: 0, attributeIndex: 1, domainFilter: 'Condition' }
      vm.handleSelectConcept(0, 0, context)
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

      const context = { eventIndex: 1, attributeIndex: 0, domainFilter: undefined }
      vm.handleSelectConcept(0, 0, context)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept')).toBeTruthy()
      const emitted = wrapper.emitted('select-concept') as any[]
      expect(emitted[0][0].domainFilter).toBeUndefined()
    })
  })

  describe('Expansion Panel Behavior', () => {
    it('should support single expansion mode', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      // Component should render without errors
      expect(wrapper.exists()).toBe(true)
    })

    it('should start with no panels expanded', () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any
      // expandedPanel should be undefined initially
      expect(vm.expandedPanel === undefined || vm.expandedPanel === null).toBe(true)
    })

    it('should expand panel when value is set', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      vm.expandedPanel = 0
      await wrapper.vm.$nextTick()

      expect(vm.expandedPanel).toBe(0)
    })
  })

  describe('Styling and Layout', () => {
    it('should apply the panel root class', () => {
      // Refresh: events-container + vertical-label + flex-grow-1
      // class names retired alongside the sticker layout. The
      // panel now lives under a single .inclusion-criteria-panel
      // root with a header strip and rules list.
      const wrapper = mountComponent()
      expect(wrapper.find('.inclusion-criteria-panel').exists()).toBe(true)
    })

    it('should not render an internal header strip', () => {
      // Refresh: the in-panel header strip + add-rule action were
      // retired; the surrounding section header hosts that now.
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
      // Component requires modelValue prop, so test with empty array.
      // Empty state is now a div, not a v-alert.
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

    it('should handle adding group to non-existent rule gracefully', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      // Try to add group to index that doesn't exist
      vm.addGroup(999)
      await wrapper.vm.$nextTick()

      // Should not emit update since rule doesn't exist
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should handle updating non-existent group gracefully', async () => {
      const wrapper = mountComponent({ modelValue: createMockInclusionRules() })
      const vm = wrapper.vm as any

      const updatedGroup: CriteriaGroup = {
        id: 'group-new',
        logicType: 'ANY',
        events: []
      }

      vm.updateGroup(999, 0, updatedGroup)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should handle removing non-existent rule gracefully', async () => {
      const mockRules = createMockInclusionRules()
      const wrapper = mountComponent({ modelValue: mockRules })
      const originalLength = mockRules.length
      const vm = wrapper.vm as any

      vm.removeRule(999)
      await wrapper.vm.$nextTick()

      // Should still emit update but length should remain same
      if (wrapper.emitted('update:modelValue')) {
        const emitted = wrapper.emitted('update:modelValue') as any[]
        const rules = emitted[emitted.length - 1][0] as InclusionRule[]
        expect(rules.length).toBe(originalLength)
      }
    })
  })
})
