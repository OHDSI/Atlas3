import type { ConceptSetSelection, CriteriaGroup, DateAdjustment } from '@/models/circe-types'
import type { ConceptSetOption, ConceptSetSelectionTarget, ModelAccessor } from './criteria-editor.types'

export function createObjectKeyGenerator() {
  const keys = new WeakMap<object, number>()
  let nextKey = 0

  return (object: object) => {
    let key = keys.get(object)

    if (key === undefined) {
      key = nextKey++
      keys.set(object, key)
    }

    return key
  }
}

export function createConceptSetComponentProps(
  modelValue: ConceptSetSelection,
  conceptSets: ConceptSetOption[],
  selectLabel: string,
  onSelect: (target: ConceptSetSelectionTarget | undefined) => void,
  onEdit: (target: ConceptSetSelectionTarget | undefined) => void,
) {
  return {
    modelValue,
    conceptSets,
    compact: true,
    selectLabel,
    onSelect,
    onEdit,
  }
}

export function createSchemaFieldProps<T extends Record<string, unknown>>(modelValue: T) {
  return { modelValue }
}

export function createConceptSetModel<T extends Record<string, unknown>>(target: ModelAccessor<T>, fieldKey: keyof T & string) {
  return {
    get CodesetId() {
      return target()[fieldKey] as number | undefined
    },
    set CodesetId(value: number | undefined) {
      (target() as Record<string, unknown>)[fieldKey] = value
    },
  }
}

export function createDefaultDateAdjustment(): DateAdjustment {
  return {
    StartWith: 'START_DATE',
    StartOffset: 0,
    EndWith: 'END_DATE',
    EndOffset: 0,
  }
}

export function createDefaultCriteriaGroup(): CriteriaGroup {
  return { Type: 'ALL' }
}

export function ensureObjectField<T extends object>(
  target: Record<string, unknown>,
  fieldKey: string,
  createValue: () => T,
) {
  const existingValue = target[fieldKey]
  if (!existingValue || typeof existingValue !== 'object') {
    target[fieldKey] = createValue()
  }

  return target[fieldKey] as T
}