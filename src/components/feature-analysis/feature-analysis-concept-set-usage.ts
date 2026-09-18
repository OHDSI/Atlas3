import { walkSchema } from '@/components/cohort-editor/schema-walk'
import {
  ConceptSetIdSchema,
  ConceptSetSelectionSchema,
  CriteriaGroupSchema,
  DemographicCriteriaSchema,
  WindowedCriteriaSchema,
} from '@/models/circe-types'
import type { FeatureAnalysisCriteriaGroupItem, FeatureAnalysisDistributionItem } from '@/models/feature-analysis.types'

export interface ConceptSetFieldVisitor {
  raw(container: Record<string, unknown>, key: string): void
  wrapped(selection: { CodesetId?: number | null }): void
}

type FeatureAnalysisDesignItem = FeatureAnalysisCriteriaGroupItem | FeatureAnalysisDistributionItem

function walkFeatureAnalysisCriteria(criteria: FeatureAnalysisDesignItem, visitor: ConceptSetFieldVisitor): void {
  switch (criteria.criteriaType) {
    case 'CriteriaGroup':
      walkSchema(CriteriaGroupSchema, criteria.expression, {
        field(schema, container, key) {
          if (schema === ConceptSetIdSchema) {
            visitor.raw(container, key)
            return true
          }

          if (schema === ConceptSetSelectionSchema) {
            const selection = container[key]
            if (selection && typeof selection === 'object') {
              visitor.wrapped(selection as { CodesetId?: number | null })
            }
            return true
          }
        },
      })
      return
    case 'WindowedCriteria':
      walkSchema(WindowedCriteriaSchema, criteria.expression, {
        field(schema, container, key) {
          if (schema === ConceptSetIdSchema) {
            visitor.raw(container, key)
            return true
          }

          if (schema === ConceptSetSelectionSchema) {
            const selection = container[key]
            if (selection && typeof selection === 'object') {
              visitor.wrapped(selection as { CodesetId?: number | null })
            }
            return true
          }
        },
      })
      return
    case 'DemographicCriteria':
      walkSchema(DemographicCriteriaSchema, criteria.expression, {
        field(schema, container, key) {
          if (schema === ConceptSetIdSchema) {
            visitor.raw(container, key)
            return true
          }

          if (schema === ConceptSetSelectionSchema) {
            const selection = container[key]
            if (selection && typeof selection === 'object') {
              visitor.wrapped(selection as { CodesetId?: number | null })
            }
            return true
          }
        },
      })
  }
}

export function walkFeatureAnalysisConceptSetReferences(
  design: FeatureAnalysisDesignItem[],
  visitor: ConceptSetFieldVisitor,
): void {
  for (const criteria of design) {
    walkFeatureAnalysisCriteria(criteria, visitor)
  }
}

export function findUsedFeatureAnalysisConceptSetIds(design: FeatureAnalysisDesignItem[]): Set<number> {
  const used = new Set<number>()
  walkFeatureAnalysisConceptSetReferences(design, {
    raw: (container, key) => {
      const value = container[key]
      if (typeof value === 'number') used.add(value)
    },
    wrapped: selection => {
      if (typeof selection.CodesetId === 'number') used.add(selection.CodesetId)
    },
  })
  return used
}

export function countFeatureAnalysisConceptSetReferences(design: FeatureAnalysisDesignItem[], conceptSetId: number): number {
  let count = 0
  walkFeatureAnalysisConceptSetReferences(design, {
    raw: (container, key) => {
      if (container[key] === conceptSetId) {
        count++
      }
    },
    wrapped: selection => {
      if (selection.CodesetId === conceptSetId) {
        count++
      }
    },
  })
  return count
}

export function unassignFeatureAnalysisConceptSetId(design: FeatureAnalysisDesignItem[], conceptSetId: number): void {
  walkFeatureAnalysisConceptSetReferences(design, {
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