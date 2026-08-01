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
 * `walkConceptSetReferences` is the shared traversal primitive. `findUsedConceptSetIds`
 * and `unassignConceptSetId` are just two different visitors passed to it; other
 * object-graph use-cases (beyond concept sets) can reuse the same walking approach.
 */
import { z } from 'zod'
import {
  CohortExpressionSchema,
  ConceptSetIdSchema,
  ConceptSetSelectionSchema,
  type CohortExpression,
  type ConceptSetSelection,
} from './circe.types'

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
  walkObjectShape(CohortExpressionSchema, expression as unknown as Record<string, unknown>, visitor)
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

/**
 * Unwraps ZodOptional/ZodNullable/ZodDefault/ZodEffects layers to get to the
 * underlying schema used for the reference-equality and instanceof checks below.
 */
function unwrapType(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (current instanceof z.ZodOptional) {
      current = current.unwrap()
    } else if (current instanceof z.ZodNullable) {
      current = current.unwrap()
    } else if (current instanceof z.ZodDefault) {
      current = current.removeDefault()
    } else if (current instanceof z.ZodEffects) {
      current = current.innerType()
    } else {
      return current
    }
  }
}

/**
 * Walks the fields of a Zod object schema against a matching data object, dispatching
 * each field to the visitor (for marked reference fields) or recursing further into
 * the object graph (for anything else that might hold nested reference fields).
 */
function walkObjectShape(schema: z.AnyZodObject, data: Record<string, unknown>, visitor: ConceptSetFieldVisitor): void {
  const shape: Record<string, z.ZodTypeAny> = schema.shape
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const unwrapped = unwrapType(fieldSchema)

    if (unwrapped === ConceptSetIdSchema) {
      visitor.raw(data, key)
      continue
    }

    if (unwrapped === ConceptSetSelectionSchema) {
      const selection = data[key]
      if (selection && typeof selection === 'object') {
        visitor.wrapped(selection as ConceptSetSelection)
      }
      continue
    }

    walkValue(unwrapped, data[key], visitor)
  }
}

/**
 * Recurses into any container-like schema (object, array, polymorphic wrapper union,
 * lazy/recursive reference, or intersection) that might hold reference fields deeper
 * in the graph. Leaf schemas (string, number, boolean, enum, etc.) are no-ops here -
 * a leaf that itself needs to be treated as a reference is handled by the marker
 * checks in `walkObjectShape` before this function is ever reached for it.
 */
function walkValue(schema: z.ZodTypeAny, data: unknown, visitor: ConceptSetFieldVisitor): void {
  if (data === null || data === undefined) return

  const type = unwrapType(schema)

  if (type instanceof z.ZodObject) {
    walkObjectShape(type, data as Record<string, unknown>, visitor)
    return
  }

  if (type instanceof z.ZodArray) {
    if (!Array.isArray(data)) return
    const elementSchema: z.ZodTypeAny = type.element
    for (const item of data) {
      walkValue(elementSchema, item, visitor)
    }
    return
  }

  if (type instanceof z.ZodUnion) {
    // Polymorphic Jackson wrapper union: data is `{ WrapperKey: innerData }`
    const record = data as Record<string, unknown>
    const options: z.ZodTypeAny[] = type.options
    for (const wrapperKey of Object.keys(record)) {
      const option = options.find(
        (candidate): candidate is z.AnyZodObject => candidate instanceof z.ZodObject && wrapperKey in candidate.shape,
      )
      if (option) {
        // Existence of `wrapperKey` on `option.shape` was already confirmed by the predicate above.
        walkValue(option.shape[wrapperKey]!, record[wrapperKey], visitor)
      }
    }
    return
  }

  if (type instanceof z.ZodLazy) {
    walkValue(type.schema, data, visitor)
    return
  }

  if (type instanceof z.ZodIntersection) {
    walkValue(type._def.left, data, visitor)
    walkValue(type._def.right, data, visitor)
    return
  }

  // Leaf schema (string/number/boolean/enum/etc.) - nothing further to walk.
}
