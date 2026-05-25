import { describe, it, expect } from 'vitest'
import { useNestedCriteria } from '@/composables/useNestedCriteria'
import type { NestedCriteria, CohortEvent } from '@/models/cohort.types'

describe('useNestedCriteria', () => {
  describe('initialization', () => {
    it('creates nested criteria with default values when no initial value provided', () => {
      const { nested } = useNestedCriteria()

      expect(nested.value.id).toBeTruthy()
      expect(nested.value.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(nested.value.logicType).toBe('ALL')
      expect(nested.value.events).toEqual([])
      expect(nested.value.count).toBeUndefined()
    })

    it('initializes with provided nested criteria', () => {
      const initial: NestedCriteria = {
        id: 'test-id-123',
        logicType: 'ANY',
        events: []
      }

      const { nested } = useNestedCriteria(initial)

      expect(nested.value.id).toBe('test-id-123')
      expect(nested.value.logicType).toBe('ANY')
    })
  })

  describe('computed properties', () => {
    it('hasEvents returns false when events array is empty', () => {
      const { hasEvents } = useNestedCriteria()
      expect(hasEvents.value).toBe(false)
    })

    it('hasEvents returns true when events array has items', () => {
      const { nested: _nested, hasEvents, addEvent } = useNestedCriteria()
      addEvent('DrugExposure')
      expect(hasEvents.value).toBe(true)
    })

    it('eventCount returns correct number of events', () => {
      const { eventCount, addEvent } = useNestedCriteria()
      expect(eventCount.value).toBe(0)

      addEvent('DrugExposure')
      expect(eventCount.value).toBe(1)

      addEvent('ConditionOccurrence')
      expect(eventCount.value).toBe(2)
    })
  })

  describe('addEvent', () => {
    it('adds event with specified criteria type', () => {
      const { nested: _nested, addEvent } = useNestedCriteria()

      const event = addEvent('DrugExposure')

      expect(_nested.value.events).toHaveLength(1)
      expect(event.criteriaType).toBe('DrugExposure')
      expect(event.id).toBeTruthy()
      expect(event.attributes).toEqual([])
    })

    it('adds event with custom concept set', () => {
      const { addEvent } = useNestedCriteria()

      const conceptSet = { id: 42, name: 'Test Concept Set' }
      const event = addEvent('DrugExposure', conceptSet)

      expect(event.conceptSet).toEqual(conceptSet)
    })

    it('adds event with default concept set when not provided', () => {
      const { addEvent } = useNestedCriteria()

      const event = addEvent('ConditionOccurrence')

      expect(event.conceptSet).toEqual({ id: null, name: 'Select concept set...' })
    })

    it('generates unique IDs for multiple events', () => {
      const { addEvent } = useNestedCriteria()

      const _event1 = addEvent('DrugExposure')
      const event2 = addEvent('ConditionOccurrence')

      expect(_event1.id).not.toBe(event2.id)
    })
  })

  describe('removeEvent', () => {
    it('removes event by ID', () => {
      const { nested, addEvent, removeEvent } = useNestedCriteria()

      const event = addEvent('DrugExposure')
      expect(nested.value.events).toHaveLength(1)

      const removed = removeEvent(event.id)

      expect(removed).toBe(true)
      expect(nested.value.events).toHaveLength(0)
    })

    it('returns false when event ID not found', () => {
      const { removeEvent } = useNestedCriteria()

      const removed = removeEvent('non-existent-id')

      expect(removed).toBe(false)
    })

    it('removes only the specified event', () => {
      const { nested, addEvent, removeEvent } = useNestedCriteria()

      const event1 = addEvent('DrugExposure')
      const event2 = addEvent('ConditionOccurrence')
      const _event3 = addEvent('ProcedureOccurrence')

      removeEvent(event2.id)

      expect(nested.value.events).toHaveLength(2)
      expect(nested.value.events[0].id).toBe(event1.id)
      expect(nested.value.events[1].id).toBe(_event3.id)
    })
  })

  describe('updateLogicType', () => {
    it('updates logic type to ALL and removes count', () => {
      const { nested, updateLogicType } = useNestedCriteria({
        id: 'test',
        logicType: 'AT_LEAST',
        count: 2,
        events: []
      })

      updateLogicType('ALL')

      expect(nested.value.logicType).toBe('ALL')
      expect(nested.value.count).toBeUndefined()
    })

    it('updates logic type to ANY and removes count', () => {
      const { nested, updateLogicType } = useNestedCriteria({
        id: 'test',
        logicType: 'AT_MOST',
        count: 3,
        events: []
      })

      updateLogicType('ANY')

      expect(nested.value.logicType).toBe('ANY')
      expect(nested.value.count).toBeUndefined()
    })

    it('updates logic type to AT_LEAST and sets count', () => {
      const { nested, updateLogicType } = useNestedCriteria()

      updateLogicType('AT_LEAST', 2)

      expect(nested.value.logicType).toBe('AT_LEAST')
      expect(nested.value.count).toBe(2)
    })

    it('updates logic type to AT_MOST and sets count', () => {
      const { nested, updateLogicType } = useNestedCriteria()

      updateLogicType('AT_MOST', 3)

      expect(nested.value.logicType).toBe('AT_MOST')
      expect(nested.value.count).toBe(3)
    })

    it('defaults count to 1 for AT_LEAST when not provided', () => {
      const { nested, updateLogicType } = useNestedCriteria()

      updateLogicType('AT_LEAST')

      expect(nested.value.count).toBe(1)
    })

    it('defaults count to 1 for AT_MOST when not provided', () => {
      const { nested, updateLogicType } = useNestedCriteria()

      updateLogicType('AT_MOST')

      expect(nested.value.count).toBe(1)
    })
  })

  describe('calculateDepth', () => {
    it('returns 0 for event with no nested criteria', () => {
      const { calculateDepth } = useNestedCriteria()

      const event: CohortEvent = {
        id: 'test-1',
        criteriaType: 'DrugExposure',
        attributes: []
      }

      expect(calculateDepth(event)).toBe(0)
    })

    it('returns 1 for event with one level of nesting', () => {
      const { calculateDepth } = useNestedCriteria()

      const event: CohortEvent = {
        id: 'test-1',
        criteriaType: 'DrugExposure',
        attributes: [],
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: [
            { id: 'test-2', criteriaType: 'ConditionOccurrence', attributes: [] }
          ]
        }
      }

      expect(calculateDepth(event)).toBe(1)
    })

    it('returns correct depth for multiple nesting levels', () => {
      const { calculateDepth } = useNestedCriteria()

      const event: CohortEvent = {
        id: 'test-1',
        criteriaType: 'DrugExposure',
        attributes: [],
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: [
            {
              id: 'test-2',
              criteriaType: 'ConditionOccurrence',
              attributes: [],
              nestedCriteria: {
                id: 'nested-2',
                logicType: 'ANY',
                events: [
                  { id: 'test-3', criteriaType: 'ProcedureOccurrence', attributes: [] }
                ]
              }
            }
          ]
        }
      }

      expect(calculateDepth(event)).toBe(2)
    })
  })

  describe('validateDepth', () => {
    it('returns true for depth <= 10', () => {
      const { validateDepth } = useNestedCriteria()

      expect(validateDepth(0)).toBe(true)
      expect(validateDepth(5)).toBe(true)
      expect(validateDepth(10)).toBe(true)
    })

    it('returns false for depth > 10', () => {
      const { validateDepth } = useNestedCriteria()

      expect(validateDepth(11)).toBe(false)
      expect(validateDepth(15)).toBe(false)
      expect(validateDepth(100)).toBe(false)
    })
  })

  describe('hasCircularReference', () => {
    it('returns false when no circular reference exists', () => {
      const { hasCircularReference } = useNestedCriteria()

      const event: CohortEvent = {
        id: 'test-1',
        criteriaType: 'DrugExposure',
        attributes: [],
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: [
            { id: 'test-2', criteriaType: 'ConditionOccurrence', attributes: [] }
          ]
        }
      }

      expect(hasCircularReference(event)).toBe(false)
    })

    it('returns true when event references itself', () => {
      const { hasCircularReference } = useNestedCriteria()

      const event: CohortEvent = {
        id: 'test-1',
        criteriaType: 'DrugExposure',
        attributes: []
      }

      // Create circular reference
      event.nestedCriteria = {
        id: 'nested-1',
        logicType: 'ALL',
        events: [event]
      }

      expect(hasCircularReference(event)).toBe(true)
    })

    it('returns true when circular reference exists deep in tree', () => {
      const { hasCircularReference } = useNestedCriteria()

      const rootEvent: CohortEvent = {
        id: 'test-1',
        criteriaType: 'DrugExposure',
        attributes: []
      }

      const childEvent: CohortEvent = {
        id: 'test-2',
        criteriaType: 'ConditionOccurrence',
        attributes: []
      }

      // Create circular reference
      rootEvent.nestedCriteria = {
        id: 'nested-1',
        logicType: 'ALL',
        events: [childEvent]
      }

      childEvent.nestedCriteria = {
        id: 'nested-2',
        logicType: 'ANY',
        events: [rootEvent]
      }

      expect(hasCircularReference(rootEvent)).toBe(true)
    })
  })

  describe('getAllEventIds', () => {
    it('returns empty set for nested criteria with no events', () => {
      const { getAllEventIds } = useNestedCriteria()

      const ids = getAllEventIds()

      expect(ids.size).toBe(0)
    })

    it('returns IDs of all events in flat structure', () => {
      const { addEvent, getAllEventIds } = useNestedCriteria()

      const _event1 = addEvent('DrugExposure')
      const event2 = addEvent('ConditionOccurrence')

      const ids = getAllEventIds()

      expect(ids.size).toBe(2)
      expect(ids.has(_event1.id)).toBe(true)
      expect(ids.has(event2.id)).toBe(true)
    })

    it('returns IDs of all events including nested ones', () => {
      const { getAllEventIds } = useNestedCriteria()

      const events: CohortEvent[] = [
        {
          id: 'test-1',
          criteriaType: 'DrugExposure',
          attributes: [],
          nestedCriteria: {
            id: 'nested-1',
            logicType: 'ALL',
            events: [
              { id: 'test-2', criteriaType: 'ConditionOccurrence', attributes: [] }
            ]
          }
        }
      ]

      const ids = getAllEventIds(events)

      expect(ids.size).toBe(2)
      expect(ids.has('test-1')).toBe(true)
      expect(ids.has('test-2')).toBe(true)
    })
  })

  describe('getLogicTypeDisplay', () => {
    it('returns correct display for ALL', () => {
      const { getLogicTypeDisplay, updateLogicType } = useNestedCriteria()
      updateLogicType('ALL')

      expect(getLogicTypeDisplay()).toBe('ALL of the following')
    })

    it('returns correct display for ANY', () => {
      const { getLogicTypeDisplay, updateLogicType } = useNestedCriteria()
      updateLogicType('ANY')

      expect(getLogicTypeDisplay()).toBe('ANY of the following')
    })

    it('returns correct display for AT_LEAST with count', () => {
      const { getLogicTypeDisplay, updateLogicType } = useNestedCriteria()
      updateLogicType('AT_LEAST', 3)

      expect(getLogicTypeDisplay()).toBe('At least 3')
    })

    it('returns correct display for AT_MOST with count', () => {
      const { getLogicTypeDisplay, updateLogicType } = useNestedCriteria()
      updateLogicType('AT_MOST', 2)

      expect(getLogicTypeDisplay()).toBe('At most 2')
    })
  })

  describe('getAvailableCountOptions', () => {
    it('returns [1] when no events exist', () => {
      const { getAvailableCountOptions } = useNestedCriteria()

      expect(getAvailableCountOptions()).toEqual([1])
    })

    it('returns correct options based on event count', () => {
      const { addEvent, getAvailableCountOptions } = useNestedCriteria()

      addEvent('DrugExposure')
      addEvent('ConditionOccurrence')
      addEvent('ProcedureOccurrence')

      expect(getAvailableCountOptions()).toEqual([1, 2, 3])
    })

    it('updates options when events are added', () => {
      const { addEvent, getAvailableCountOptions } = useNestedCriteria()

      expect(getAvailableCountOptions()).toEqual([1])

      addEvent('DrugExposure')
      expect(getAvailableCountOptions()).toEqual([1])

      addEvent('ConditionOccurrence')
      expect(getAvailableCountOptions()).toEqual([1, 2])
    })

    it('updates options when events are removed', () => {
      const { addEvent, removeEvent, getAvailableCountOptions } = useNestedCriteria()

      const _event1 = addEvent('DrugExposure')
      const event2 = addEvent('ConditionOccurrence')
      const _event3 = addEvent('ProcedureOccurrence')

      expect(getAvailableCountOptions()).toEqual([1, 2, 3])

      removeEvent(event2.id)
      expect(getAvailableCountOptions()).toEqual([1, 2])
    })
  })
})
