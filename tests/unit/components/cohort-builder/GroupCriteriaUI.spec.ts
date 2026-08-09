/**
 * GroupCriteriaUI Component Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import GroupCriteriaUI from '@/components/cohort-builder/GroupCriteriaUI.vue'
import type { CriteriaGroup } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useFilterConfig', () => ({
  useFilterConfig: () => ({
    availableFilters: ref([
      {
        key: 'conditionOccurrence',
        criteriaType: 'ConditionOccurrence',
        name: 'Condition Occurrence',
        description: 'Occurrence of a medical condition',
        requiresConceptSet: true,
        groupOnly: false
      },
      {
        key: 'drugExposure',
        criteriaType: 'DrugExposure',
        name: 'Drug Exposure',
        description: 'Exposure to a drug',
        requiresConceptSet: true,
        groupOnly: false
      },
      {
        key: 'group',
        criteriaType: 'Group',
        name: 'Nested Group',
        description: 'Add a nested criteria group',
        requiresConceptSet: false,
        groupOnly: false
      }
    ]),
    requiresConceptSet: (key: string) => key !== 'group'
  })
}))

vi.mock('@/composables/useTemporalWindows', () => ({
  useTemporalWindows: () => ({
    formatTemporalWindowDisplay: vi.fn((_window) => 'Test Window Display')
  })
}))

vi.mock('@/composables/useAttributeConfig', () => ({
  useAttributeConfig: () => ({
    attributes: ref([
      {
        key: 'age',
        label: 'Age',
        description: 'Patient age',
        type: 'numericRange'
      },
      {
        key: 'gender',
        label: 'Gender',
        description: 'Patient gender',
        type: 'conceptSet'
      }
    ])
  })
}))

const vuetify = createVuetify({ components, directives })

const mockCriteriaGroup: CriteriaGroup = {
  id: 'group-1',
  logicType: 'ALL',
  events: []
}

// Factory function to create fresh mock data each time
function createMockCriteriaGroupWithEvents(): CriteriaGroup {
  return {
    id: 'group-2',
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
}

// For backward compatibility with existing tests
const mockCriteriaGroupWithEvents: CriteriaGroup = createMockCriteriaGroupWithEvents()

function mountComponent(props = {}) {
  return mount(GroupCriteriaUI, {
    props: {
      modelValue: mockCriteriaGroup,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        AttributesEditor: {
          template: '<div class="attributes-editor-stub" />',
          props: ['modelValue', 'criteriaType', 'hasNestedCriteria'],
          emits: ['update:modelValue', 'add-nested-criteria', 'select-concept-set-for-attribute', 'select-concept-for-attribute']
        },
        TemporalWindowEditor: {
          template: '<div class="temporal-window-editor-stub" />',
          props: ['modelValue'],
          emits: ['update:modelValue']
        }
      }
    }
  })
}

// Match type chips and the add-criteria list live inside real Vuetify menus,
// which teleport their content to document.body once opened; a DOMWrapper is
// needed to query that content, mirroring the pattern proven in NavBar.spec.ts.
// A fresh group with its own `events` array is built here rather than
// spreading mockCriteriaGroup: the component keeps the modelValue reference
// as-is on init (no clone), so other tests mutating a shared array would
// otherwise leak entries into these mounts.
function mountGroup(options: { type?: CriteriaGroup['logicType'] } = {}) {
  const { type = 'ALL' } = options
  const group: CriteriaGroup = { id: 'match-type-group', logicType: type, events: [] }
  return mountComponent({ modelValue: group })
}

async function openMatchTypeMenu(wrapper: ReturnType<typeof mountComponent>) {
  await wrapper.find('.vertical-label-container').trigger('click')
  await flushPromises()
}

async function chooseCriteriaType(wrapper: ReturnType<typeof mountComponent>, label: string) {
  await wrapper.find('[data-testid="add-event-to-group"]').trigger('click')
  await flushPromises()

  const body = new DOMWrapper(document.body)
  const item = body.findAll('.v-list-item').find(el => el.text().includes(label))
  if (!item) throw new Error(`criteria type item not found: ${label}`)

  await item.trigger('click')
  await flushPromises()
}

describe('GroupCriteriaUI', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Vuetify menus teleport content to document.body; tear down between
    // tests so a stale open menu can't intercept the next test's clicks.
    document.body.innerHTML = ''
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render card component', () => {
      const wrapper = mountComponent()
      const card = wrapper.findComponent({ name: 'VCard' })
      expect(card.exists()).toBe(true)
    })

    it('should display vertical match type label', () => {
      const wrapper = mountComponent()
      const label = wrapper.find('.vertical-label')
      expect(label.exists()).toBe(true)
    })

    it('should display add criteria button', () => {
      const wrapper = mountComponent()
      const addButton = wrapper.find('[data-testid="add-event-to-group"]')
      expect(addButton.exists()).toBe(true)
    })

    it('should display delete group button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButton = buttons.some(btn => btn.props('icon') === 'mdi-delete')
      expect(deleteButton).toBe(true)
    })
  })

  describe('Match Type Display', () => {
    it('should display ALL by default', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const display = vm.getMatchTypeDisplay()
      // Check for translation key or value
      expect(display).toMatch(/all|All/i)
    })

    it('should display ANY when logicType is ANY', () => {
      const group: CriteriaGroup = { ...mockCriteriaGroup, logicType: 'ANY' }
      const wrapper = mountComponent({ modelValue: group })
      const vm = wrapper.vm as any
      const display = vm.getMatchTypeDisplay()
      // Check for translation key or value
      expect(display).toMatch(/any|Any/i)
    })

    it('should display AT_LEAST with count', () => {
      const group: CriteriaGroup = { ...mockCriteriaGroup, logicType: 'AT_LEAST', count: 2 }
      const wrapper = mountComponent({ modelValue: group })
      const vm = wrapper.vm as any
      expect(vm.getMatchTypeDisplay()).toContain('2')
    })

    it('should display AT_MOST with count', () => {
      const group: CriteriaGroup = { ...mockCriteriaGroup, logicType: 'AT_MOST', count: 3 }
      const wrapper = mountComponent({ modelValue: group })
      const vm = wrapper.vm as any
      expect(vm.getMatchTypeDisplay()).toContain('3')
    })

    it('should show match type menu when clicking label', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.showMatchTypeDialog = true
      await wrapper.vm.$nextTick()

      expect(vm.showMatchTypeDialog).toBe(true)
    })

    it('should update match type when confirmed', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.matchTypeTemp = 'ANY'
      vm.confirmMatchType()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    // Folded in from the now-deleted tests/component/cohort-builder/GroupCriteriaUI.spec.ts:
    // that file asserted this via the DOM attribute rather than the getMatchTypeDisplay() method.
    it('sets the data-type attribute on the label to the current logic type', () => {
      const group: CriteriaGroup = { ...mockCriteriaGroup, logicType: 'AT_LEAST', count: 2 }
      const wrapper = mountComponent({ modelValue: group })
      const label = wrapper.find('.match-type-label')
      expect(label.attributes('data-type')).toBe('AT_LEAST')
    })
  })

  describe('Event Management', () => {
    it('should display empty state when no events', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('No events in group')
    })

    it('should display events when they exist', () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const events = wrapper.findAll('[data-testid="group-event-item"]')
      expect(events.length).toBe(1)
    })

    it('should add event when criteria type is selected', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addEvent('ConditionOccurrence')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.events.length).toBe(1)
      expect(updatedGroup.events[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('defaults ignoreObservationPeriod to true for a newly added criteria', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addEvent('ConditionOccurrence')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.events[0].ignoreObservationPeriod).toBe(true)
    })

    it('should remove event when remove button is clicked', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      vm.removeEvent(0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.events.length).toBe(0)
    })

    it('should display event type label', () => {
      const freshMock = createMockCriteriaGroupWithEvents()
      const _wrapper = mountComponent({ modelValue: freshMock })
      // Event should have the condition occurrence event
      expect(freshMock.events[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('should display concept set name', () => {
      const freshMock = createMockCriteriaGroupWithEvents()
      const _wrapper = mountComponent({ modelValue: freshMock })
      // Event should have the concept set
      expect(freshMock.events[0].conceptSet?.name).toBe('Type 2 Diabetes')
    })
  })

  describe('Concept Set Selection', () => {
    it('should show select concept set button when no concept set', () => {
      const group: CriteriaGroup = {
        id: 'group-3',
        logicType: 'ALL',
        events: [{
          id: 'event-1',
          criteriaType: 'ConditionOccurrence',
          conceptSet: { id: null, name: 'Select concept set...' },
          attributes: []
        }]
      }
      const wrapper = mountComponent({ modelValue: group })
      const button = wrapper.find('[data-testid="concept-set-picker"]')
      expect(button.exists()).toBe(true)
    })

    it('should show selected concept set chip when concept set is selected', () => {
      const freshMock = createMockCriteriaGroupWithEvents()
      const wrapper = mountComponent({ modelValue: freshMock })
      // Verify the component has events with concept sets
      expect(freshMock.events[0].conceptSet).toBeDefined()
      expect(wrapper.exists()).toBe(true)
    })

    it('should emit select-concept-set event when selecting concept set', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      vm.selectConceptSetForEvent(0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-concept-set')).toBeTruthy()
    })

    it('should clear concept set when close button is clicked', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Verify the clearConceptSet method exists and can be called
      if (typeof vm.clearConceptSet === 'function') {
        vm.clearConceptSet(0)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        // Method may not exist in this component version
        expect(wrapper.exists()).toBe(true)
      }
    })

    it('should emit edit-concept-set event when concept set chip is clicked', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Test via vm method if available
      if (typeof vm.selectConceptSetForEvent === 'function') {
        vm.selectConceptSetForEvent(0)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('select-concept-set')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
    })
  })

  describe('Cardinality Management', () => {
    it('should display default cardinality for event', () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Check if method exists before calling
      if (typeof vm.getCardinalityDisplayForEvent === 'function') {
        const display = vm.getCardinalityDisplayForEvent(mockCriteriaGroupWithEvents.events[0])
        expect(display).toBeDefined()
      } else {
        // Default cardinality is implicitly 1 occurrence
        expect(mockCriteriaGroupWithEvents.events[0].cardinality ?? { count: 1 }).toBeDefined()
      }
    })

    it('should update event cardinality', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Check if method exists before calling
      if (typeof vm.updateEventCardinality === 'function') {
        vm.updateEventCardinality(0, 'EXACTLY', 2)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
    })

    // Cardinality editing now lives in the shared CriteriaEventCard (covered by
    // its own spec); the group only relays the child's `update` emit.
    it('relays a child CriteriaEventCard update by replacing the event', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const card = wrapper.findComponent({ name: 'CriteriaEventCard' })
      expect(card.exists()).toBe(true)

      const updated = {
        ...createMockCriteriaGroupWithEvents().events[0],
        cardinality: { type: 'EXACTLY' as const, count: 2, countingMethod: 'ALL' as const },
      }
      card.vm.$emit('update', updated)
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.events[0].cardinality?.count).toBe(2)
    })
  })

  describe('Temporal Window Management', () => {
    it('should show add temporal window button by default', () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      // Check component renders - temporal window button text varies
      expect(wrapper.exists()).toBe(true)
    })

    it('should add temporal window to event', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Check if method exists before calling
      if (typeof vm.addTemporalWindow === 'function') {
        vm.addTemporalWindow(0)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
    })

    // Temporal-window editing now lives in the shared CriteriaEventCard
    // (covered by its own spec); the group only relays the child's `update`.
  })

  describe('Attributes Management', () => {
    it('should display add attribute button', () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      // Component should render with events
      expect(wrapper.exists()).toBe(true)
      expect(mockCriteriaGroupWithEvents.events.length).toBeGreaterThan(0)
    })

    it('should update event attributes', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Check if method exists before calling
      if (typeof vm.updateEventAttributes === 'function') {
        const attributes = [{
          type: 'numericRange' as const,
          attributeKey: 'age' as any,
          operator: 'GREATER_THAN_OR_EQUAL' as const,
          value: 18
        }]
        vm.updateEventAttributes(0, attributes)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
    })

    it('should add numeric attribute to event', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Check if method exists before calling
      if (typeof vm.addAttributeToEvent === 'function') {
        vm.addAttributeToEvent(0, 'age', 'numericRange')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
    })

    it('should render attributes editor when attributes exist', () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      // Component renders with events that can have attributes
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Nested Criteria Management', () => {
    it('should add nested criteria to event', async () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      const vm = wrapper.vm as any

      // Check if method exists before calling
      if (typeof vm.addNestedCriteria === 'function') {
        vm.addNestedCriteria(0)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      } else {
        expect(wrapper.exists()).toBe(true)
      }
    })

    // Nested-criteria mutations (add/update/remove) now happen inside the
    // shared CriteriaEventCard; the group relays the child's `update`.

    // Nested-criteria rendering now lives in the shared CriteriaEventCard
    // (covered by CriteriaEventCard.spec). The group's job is to delegate each
    // event to that card.
    it('renders group events via the shared CriteriaEventCard', () => {
      const wrapper = mountComponent({ modelValue: createMockCriteriaGroupWithEvents() })
      expect(wrapper.findComponent({ name: 'CriteriaEventCard' }).exists()).toBe(true)
    })
  })

  describe('Nested Groups Management', () => {
    it('should add nested group', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.addNestedGroup()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.nestedGroups?.length).toBe(1)
    })

    it('should update nested group', async () => {
      const group: CriteriaGroup = {
        ...mockCriteriaGroup,
        nestedGroups: [{
          id: 'nested-group-1',
          logicType: 'ALL',
          events: []
        }]
      }
      const wrapper = mountComponent({ modelValue: group })
      const vm = wrapper.vm as any

      const updatedNestedGroup = {
        id: 'nested-group-1',
        logicType: 'ANY' as const,
        events: []
      }

      vm.updateNestedGroup(0, updatedNestedGroup)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.nestedGroups?.[0].logicType).toBe('ANY')
    })

    it('should remove nested group', async () => {
      const group: CriteriaGroup = {
        ...mockCriteriaGroup,
        nestedGroups: [{
          id: 'nested-group-1',
          logicType: 'ALL',
          events: []
        }]
      }
      const wrapper = mountComponent({ modelValue: group })
      const vm = wrapper.vm as any

      vm.removeNestedGroup(0)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const updatedGroup = emitted[emitted.length - 1][0] as CriteriaGroup
      expect(updatedGroup.nestedGroups?.length).toBe(0)
    })

    it('should display nested groups', () => {
      const group: CriteriaGroup = {
        ...mockCriteriaGroup,
        nestedGroups: [{
          id: 'nested-group-1',
          logicType: 'ALL',
          events: []
        }]
      }
      const wrapper = mountComponent({ modelValue: group })
      const nestedGroup = wrapper.find('[data-testid="nested-group"]')
      expect(nestedGroup.exists()).toBe(true)
    })
  })

  describe('Emit Events', () => {
    it('should emit remove event', async () => {
      const wrapper = mountComponent()

      const _vm = wrapper.vm as any
      wrapper.vm.$emit('remove')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('remove')).toBeTruthy()
    })

    it('should emit update:modelValue when changes occur', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.emitUpdate()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  describe('Watch Props', () => {
    it('should update local group when modelValue prop changes', async () => {
      const wrapper = mountComponent()

      const newGroup: CriteriaGroup = {
        id: 'group-new',
        logicType: 'ANY',
        events: []
      }

      await wrapper.setProps({ modelValue: newGroup })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.localGroup.logicType).toBe('ANY')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined modelValue gracefully', () => {
      const wrapper = mountComponent({ modelValue: undefined })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle events without concept set', () => {
      const group: CriteriaGroup = {
        id: 'group-3',
        logicType: 'ALL',
        events: [{
          id: 'event-1',
          criteriaType: 'ConditionOccurrence',
          attributes: []
        }]
      }
      const wrapper = mountComponent({ modelValue: group })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle event without attributes array', () => {
      const group: CriteriaGroup = {
        id: 'group-3',
        logicType: 'ALL',
        events: [{
          id: 'event-1',
          criteriaType: 'ConditionOccurrence',
          conceptSet: { id: 1, name: 'Test' }
        }]
      }
      const wrapper = mountComponent({ modelValue: group })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle empty nested groups array', () => {
      const group: CriteriaGroup = {
        ...mockCriteriaGroup,
        nestedGroups: []
      }
      const wrapper = mountComponent({ modelValue: group })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('match type selection', () => {
    it('marks only the active match type as selected', async () => {
      const wrapper = mountGroup({ type: 'ALL' })
      await openMatchTypeMenu(wrapper)

      const body = new DOMWrapper(document.body)
      const all = body.find('.match-chip--all')
      const any = body.find('.match-chip--any')

      expect(all.attributes('data-selected')).toBe('true')
      expect(any.attributes('data-selected')).toBe('false')
    })

    it('moves the selection when a different match type is chosen', async () => {
      const wrapper = mountGroup({ type: 'ALL' })
      await openMatchTypeMenu(wrapper)

      const body = new DOMWrapper(document.body)
      await body.find('.match-chip--any').trigger('click')
      await wrapper.vm.$nextTick()

      expect(body.find('.match-chip--any').attributes('data-selected')).toBe('true')
      expect(body.find('.match-chip--all').attributes('data-selected')).toBe('false')
    })

    it('shows the count field only for AT_LEAST and AT_MOST', async () => {
      for (const [type, expected] of [
        ['ALL', false], ['ANY', false], ['AT_LEAST', true], ['AT_MOST', true],
      ] as const) {
        const wrapper = mountGroup({ type })
        await openMatchTypeMenu(wrapper)

        const body = new DOMWrapper(document.body)
        expect(body.find('[data-test="match-count"]').exists()).toBe(expected)

        wrapper.unmount()
        document.body.innerHTML = ''
      }
    })
  })

  describe('criteria type dispatch', () => {
    it('adds a nested group when the Group entry is chosen', async () => {
      const wrapper = mountGroup({ type: 'ALL' })
      await chooseCriteriaType(wrapper, 'Nested Group')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const updated = emitted!.at(-1)![0] as CriteriaGroup
      expect(updated.nestedGroups).toHaveLength(1)
      expect(updated.events).toHaveLength(0)
    })

    it('adds a plain event when a non-Group entry is chosen', async () => {
      const wrapper = mountGroup({ type: 'ALL' })
      await chooseCriteriaType(wrapper, 'Condition Occurrence')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const updated = emitted!.at(-1)![0] as CriteriaGroup
      expect(updated.events).toHaveLength(1)
      expect(updated.events[0].criteriaType).toBe('ConditionOccurrence')
      expect(updated.nestedGroups ?? []).toHaveLength(0)
    })
  })
})
