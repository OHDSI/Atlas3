import type { Ref } from 'vue'
import type { Concept } from '../circe.types'

export type ModelAccessor<T> = () => T

export type CriteriaFieldKind =
  | 'numericRange'
  | 'conceptSet'
  | 'conceptArray'
  | 'dateRange'
  | 'dateAdjustment'
  | 'textFilter'
  | 'period'
  | 'criteriaGroup'

export interface CriteriaFieldSpec {
  key: string
  label: string
  kind: CriteriaFieldKind
  menuLabel: string
  createValue: () => unknown
}

export interface ConceptSetSelectionTarget {
  targetRef: Ref<number | null | undefined>
}

export interface ConceptArrayBinding {
  concepts: Ref<Concept[] | undefined>
  exclude?: Ref<boolean | undefined>
}

export interface CriteriaAttributeSpec {
  key: string
  label: string
  description?: string
  kind?: CriteriaFieldKind
  componentProps?: () => Record<string, any>
  init: () => void
  clear: () => void
  isActive: () => boolean
}

export interface ConceptSetOption {
  id: number
  name: string
}
