import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'

import {
  createConceptSetComponentProps,
  createConceptSetModel,
  createDefaultCriteriaGroup,
  createDefaultDateAdjustment,
  createObjectKeyGenerator,
  createSchemaFieldProps,
  ensureObjectField,
} from '@/components/circe/criteria/criteria-editor-helper'

describe('criteria-editor-helper', () => {
  it('generates stable object keys for the same object and distinct keys for new objects', () => {
    const getObjectKey = createObjectKeyGenerator()
    const first = {}
    const second = {}

    expect(getObjectKey(first)).toBe(getObjectKey(first))
    expect(getObjectKey(second)).not.toBe(getObjectKey(first))
  })

  it('builds concept set and schema field props without altering the inputs', () => {
    const modelValue = { CodesetId: 7 }
    const conceptSets = [{ id: 7, name: 'Test set' }]
    const onSelect = () => undefined
    const onEdit = () => undefined

    expect(createConceptSetComponentProps(modelValue, conceptSets, 'Pick', onSelect, onEdit)).toEqual({
      modelValue,
      conceptSets,
      compact: true,
      selectLabel: 'Pick',
      onSelect,
      onEdit,
    })
    expect(createSchemaFieldProps(modelValue)).toEqual({ modelValue })
  })

  it('reads and writes the selected concept set id through the model accessor', () => {
    const state = reactive({ CodesetId: 12, Other: 'value' })
    const model = createConceptSetModel(() => state, 'CodesetId')

    expect(model.CodesetId).toBe(12)
    model.CodesetId = 34
    expect(state.CodesetId).toBe(34)
  })

  it('keeps a locally activated scalar concept-set field active while storing null', () => {
    const state = reactive<{ SourceConcept?: number | null }>({ SourceConcept: null })
    const model = createConceptSetModel(() => state, 'SourceConcept')

    expect(model.isActive()).toBe(false)

    model.activate()
    expect(state.SourceConcept).toBeNull()
    expect(model.isActive()).toBe(true)

    model.CodesetId = 34
    expect(state.SourceConcept).toBe(34)
    expect(model.isActive()).toBe(true)

    model.deactivate()
    expect(state.SourceConcept).toBeUndefined()
    expect(model.isActive()).toBe(false)
  })

  it('keeps a server-loaded scalar concept-set field active after its selection is cleared', () => {
    const state = reactive<{ SourceConcept?: number | null }>({ SourceConcept: 34 })
    const model = createConceptSetModel(() => state, 'SourceConcept')

    expect(model.isActive()).toBe(true)

    model.CodesetId = undefined
    expect(state.SourceConcept).toBeUndefined()
    expect(model.isActive()).toBe(true)
  })

  it('creates the default date adjustment and initializes missing object fields', () => {
    expect(createDefaultDateAdjustment()).toEqual({
      StartWith: 'START_DATE',
      StartOffset: 0,
      EndWith: 'END_DATE',
      EndOffset: 0,
    })

    const existing = { keep: true }
    const target: Record<string, unknown> = {
      existing,
      invalid: null,
    }

    expect(ensureObjectField(target, 'existing', () => ({ keep: false }))).toBe(existing)
    const created = ensureObjectField(target, 'missing', () => ({ created: true }))
    expect(created).toEqual({ created: true })
    expect(target.missing).toBe(created)
    expect(ensureObjectField(target, 'invalid', () => ({ replaced: true }))).toEqual({ replaced: true })
  })
})

describe('createDefaultCriteriaGroup', () => {
  // circe-be calls group.type.equalsIgnoreCase(...) without a null check, so a
  // group that reaches SQL generation without a Type throws rather than
  // generating.
  it('carries an explicit match type', () => {
    expect(createDefaultCriteriaGroup()).toEqual({ Type: 'ALL' })
  })

  it('returns a fresh object each call', () => {
    expect(createDefaultCriteriaGroup()).not.toBe(createDefaultCriteriaGroup())
  })
})