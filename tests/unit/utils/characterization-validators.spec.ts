/**
 * Characterization Validators Tests
 *
 * One test per rule in `validateCharacterization`. The validators are
 * pure synchronous functions, so this is a straight unit test.
 */
import { describe, it, expect } from 'vitest'

import {
  validateCharacterization,
  countByLevel,
  type ValidationMessage,
} from '@/utils/characterization-validators'
import type { CharacterizationDefinition } from '@/models/characterization.types'

function makeBaseDef(
  overrides: Partial<CharacterizationDefinition> = {}
): CharacterizationDefinition {
  return {
    name: 'My Char',
    cohorts: [{ id: 1, name: 'Cohort A' }],
    featureAnalyses: [{ id: 10 }],
    stratas: [],
    ...overrides,
  }
}

function findRule(messages: ValidationMessage[], ruleId: string) {
  return messages.find((m) => m.ruleId === ruleId)
}

describe('validateCharacterization', () => {
  it('errors when name is empty', () => {
    const messages = validateCharacterization(makeBaseDef({ name: '' }))
    const m = findRule(messages, 'nameRequired')
    expect(m).toBeDefined()
    expect(m?.level).toBe('error')
  })

  it('errors when name is whitespace only', () => {
    const messages = validateCharacterization(makeBaseDef({ name: '   ' }))
    expect(findRule(messages, 'nameRequired')?.level).toBe('error')
  })

  it('errors when cohorts is empty', () => {
    const messages = validateCharacterization(makeBaseDef({ cohorts: [] }))
    const m = findRule(messages, 'cohortsRequired')
    expect(m).toBeDefined()
    expect(m?.level).toBe('error')
  })

  it('errors when featureAnalyses is empty', () => {
    const messages = validateCharacterization(makeBaseDef({ featureAnalyses: [] }))
    const m = findRule(messages, 'featureAnalysesRequired')
    expect(m).toBeDefined()
    expect(m?.level).toBe('error')
  })

  it('warns when a stratum has no name', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        stratas: [{ id: 's1', name: '', criteria: {} }],
      })
    )
    const m = findRule(messages, 'strataNameMissing')
    expect(m).toBeDefined()
    expect(m?.level).toBe('warning')
  })

  it('warns when two strata share a name', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        stratas: [
          { id: 's1', name: 'Same', criteria: {} },
          { id: 's2', name: 'Same', criteria: {} },
        ],
      })
    )
    const dup = findRule(messages, 'strataNameDuplicate')
    expect(dup).toBeDefined()
    expect(dup?.level).toBe('warning')
    expect(dup?.params?.name).toBe('Same')
  })

  it('errors when a stratum has null criteria', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        stratas: [{ id: 's1', name: 'A', criteria: null }],
      })
    )
    const m = findRule(messages, 'strataCriteriaInvalid')
    expect(m).toBeDefined()
    expect(m?.level).toBe('error')
  })

  it('errors when stratum criteria is an unparseable JSON string', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        stratas: [{ id: 's1', name: 'A', criteria: '{not json' }],
      })
    )
    const m = findRule(messages, 'strataCriteriaInvalid')
    expect(m).toBeDefined()
    expect(m?.level).toBe('error')
  })

  it('does not error when criteria is a valid JSON string', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        stratas: [{ id: 's1', name: 'A', criteria: '{"x":1}' }],
      })
    )
    expect(findRule(messages, 'strataCriteriaInvalid')).toBeUndefined()
  })

  it('warns when strataOnly is true but no strata defined', () => {
    const messages = validateCharacterization(
      makeBaseDef({ strataOnly: true, stratas: [] })
    )
    const m = findRule(messages, 'strataOnlyButNoStrata')
    expect(m).toBeDefined()
    expect(m?.level).toBe('warning')
  })

  it('does not warn when strataOnly is true and strata are present', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        strataOnly: true,
        stratas: [{ id: 's1', name: 'A', criteria: {} }],
      })
    )
    expect(findRule(messages, 'strataOnlyButNoStrata')).toBeUndefined()
  })

  it('emits info when more than 50 feature analyses are linked', () => {
    const featureAnalyses = Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }))
    const messages = validateCharacterization(makeBaseDef({ featureAnalyses }))
    const m = findRule(messages, 'tooManyFeatureAnalyses')
    expect(m).toBeDefined()
    expect(m?.level).toBe('info')
    expect(m?.params?.count).toBe(51)
  })

  it('returns no messages for a valid design', () => {
    const messages = validateCharacterization(
      makeBaseDef({
        stratas: [{ id: 's1', name: 'Subgroup A', criteria: { x: 1 } }],
      })
    )
    expect(messages).toEqual([])
  })

  it('countByLevel groups messages correctly', () => {
    const messages = validateCharacterization(
      makeBaseDef({ name: '', cohorts: [], stratas: [{ id: 's1', name: '', criteria: {} }] })
    )
    const counts = countByLevel(messages)
    expect(counts.error).toBeGreaterThan(0)
    expect(counts.warning).toBeGreaterThan(0)
    expect(counts.info).toBe(0)
  })
})
