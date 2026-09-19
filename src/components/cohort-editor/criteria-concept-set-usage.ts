import { walkSchema } from '@/components/cohort-editor/schema-walk'
import {
  ConceptSetIdSchema,
  ConceptSetSelectionSchema,
  CriteriaGroupSchema,
  type ConceptSetSelection,
  type CriteriaGroup,
} from '@/models/circe-types'

export interface ConceptSetFieldVisitor {
  raw(container: Record<string, unknown>, key: string): void
  wrapped(selection: ConceptSetSelection): void
}

export function walkCriteriaGroupConceptSetReferences(
  criteria: CriteriaGroup | undefined,
  visitor: ConceptSetFieldVisitor,
): void {
  if (!criteria) return

  walkSchema(CriteriaGroupSchema, criteria, {
    field(schema, container, key) {
      if (schema === ConceptSetIdSchema) {
        visitor.raw(container, key)
        return true
      }

      if (schema === ConceptSetSelectionSchema) {
        const selection = container[key]
        if (selection && typeof selection === 'object') {
          visitor.wrapped(selection as ConceptSetSelection)
        }
        return true
      }
    },
  })
}

export function findUsedCriteriaGroupConceptSetIds(criteriaList: Array<CriteriaGroup | undefined>): Set<number> {
  const used = new Set<number>()
  for (const criteria of criteriaList) {
    walkCriteriaGroupConceptSetReferences(criteria, {
      raw: (container, key) => {
        const value = container[key]
        if (typeof value === 'number') used.add(value)
      },
      wrapped: selection => {
        if (typeof selection.CodesetId === 'number') used.add(selection.CodesetId)
      },
    })
  }
  return used
}

export function countCriteriaGroupConceptSetReferences(
  criteriaList: Array<CriteriaGroup | undefined>,
  conceptSetId: number,
): number {
  let count = 0
  for (const criteria of criteriaList) {
    walkCriteriaGroupConceptSetReferences(criteria, {
      raw: (container, key) => {
        if (container[key] === conceptSetId) count++
      },
      wrapped: selection => {
        if (selection.CodesetId === conceptSetId) count++
      },
    })
  }
  return count
}

export function unassignCriteriaGroupConceptSetId(
  criteriaList: Array<CriteriaGroup | undefined>,
  conceptSetId: number,
): void {
  for (const criteria of criteriaList) {
    walkCriteriaGroupConceptSetReferences(criteria, {
      raw: (container, key) => {
        if (container[key] === conceptSetId) {
          container[key] = undefined
        }
      },
      wrapped: selection => {
        if (selection.CodesetId === conceptSetId) {
          selection.CodesetId = undefined
        }
      },
    })
  }
}