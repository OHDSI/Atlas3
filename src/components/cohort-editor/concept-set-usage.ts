/**
 * concept-set-usage.ts
 *
 * Walks the CohortExpression object graph (primary criteria, additional criteria
 * groups, inclusion rules, end strategy, censoring criteria, etc.) to locate every
 * field that references a ConceptSet by its `CodesetId`, and either collects those
 * references or clears them.
 *
 * Reference fields are identified generically, straight from the Zod schema, by
 * reference-equality against the shared `ConceptSetIdSchema` / `ConceptSetSelectionSchema`
 * instances declared in circe.types.ts - not by a hand-maintained list of field names.
 * Any schema that correctly reuses those shared instances is automatically covered here,
 * with no changes needed in this file.
 *
 * The traversal itself lives in `schema-walk.ts` and is shared with `normalize.ts`.
 * `walkConceptSetReferences` is the concept-set-shaped view of it;
 * `findUsedConceptSetIds` and `unassignConceptSetId` are two visitors passed to that.
 */
import {
  CohortExpressionSchema,
  ConceptSetIdSchema,
  ConceptSetSelectionSchema,
  type CohortExpression,
  type ConceptSetSelection,
} from './circe.types'
import { walkSchema } from './schema-walk'

/**
 * Callback pair invoked while walking the object graph.
 * - `raw` fires for plain number fields marked with `ConceptSetIdSchema` (e.g. `CodesetId`, `DrugSourceConcept`).
 * - `wrapped` fires for `ConceptSetSelection` objects (e.g. `GenderCS`).
 */
export interface ConceptSetFieldVisitor {
  raw(container: Record<string, unknown>, key: string): void
  wrapped(selection: ConceptSetSelection): void
}

/**
 * Walks every concept-set-id reference field reachable from a CohortExpression,
 * invoking the matching visitor callback for each one found.
 */
export function walkConceptSetReferences(expression: CohortExpression, visitor: ConceptSetFieldVisitor): void {
  walkSchema(CohortExpressionSchema, expression, {
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
        // Skip the subtree: the selection's own CodesetId is a ConceptSetIdSchema
        // field, so descending would report the same reference a second time.
        return true
      }
    },
  })
}

/**
 * Collects the set of ConceptSet ids referenced anywhere in the cohort expression
 * (used to compute concept set "used" / "unused" status).
 */
export function findUsedConceptSetIds(expression: CohortExpression): Set<number> {
  const used = new Set<number>()
  walkConceptSetReferences(expression, {
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

/**
 * Clears every reference to `conceptSetId` found in the cohort expression, mutating
 * `expression` in place (safe to call on a Vue reactive object). Used when a concept
 * set is deleted, so criteria fields that pointed at it don't keep a dangling id.
 * Wrapped fields (e.g. `GenderCS`) only have their `CodesetId` cleared - the rest of
 * the selection object (e.g. `IsExclusion`) is left untouched.
 */
export function unassignConceptSetId(expression: CohortExpression, conceptSetId: number): void {
  walkConceptSetReferences(expression, {
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
