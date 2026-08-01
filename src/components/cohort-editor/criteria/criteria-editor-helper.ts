import type { ConceptSetSelection, DateAdjustment } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'

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

export function createSchemaFieldProps<T extends Record<string, any>>(modelValue: T) {
  return { modelValue }
}

export function createConceptSetModel<T extends Record<string, any>>(target: T, fieldKey: keyof T & string) {
  return {
    get CodesetId() {
      return target[fieldKey] as number | undefined
    },
    set CodesetId(value: number | undefined) {
      (target as Record<string, any>)[fieldKey] = value
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

export function ensureObjectField<T extends Record<string, any>>(
  target: Record<string, any>,
  fieldKey: string,
  createValue: () => T,
) {
  const existingValue = target[fieldKey]
  if (!existingValue || typeof existingValue !== 'object') {
    target[fieldKey] = createValue()
  }

  return target[fieldKey] as T
}