/**
 * schema-walk.ts
 *
 * Generic traversal of a data object against the Zod schema that describes it.
 *
 * The circe object graph is deep, recursive and polymorphic (Jackson-style
 * wrapper unions, `z.lazy` self-references, arrays of criteria). Any code that
 * needs to visit "every X in a cohort expression" therefore has a choice: walk
 * the data and hand-maintain a list of the paths where X can appear, or walk the
 * schema and let the schema say where X appears. The second stays correct when
 * a new field or domain is added to `circe.types.ts`; the first silently misses
 * it.
 *
 * This module is that second option, factored out so there is one walker rather
 * than one per use-case. `concept-set-usage.ts` (find/clear CodesetId
 * references) and `normalize.ts` (fill in fields circe-be requires) are both
 * built on it.
 */
import { z } from 'zod'

export interface SchemaWalkVisitor {
  /**
   * Fires once per declared field of an object schema, before that field's value
   * is descended into, with the field's schema already unwrapped of
   * optional/nullable/default/effects layers.
   *
   * Return `true` to skip descending into the value — needed when a visitor
   * handles a subtree itself and would otherwise see its contents twice.
   */
  field?(schema: z.ZodTypeAny, container: Record<string, unknown>, key: string): boolean | void

  /**
   * Fires once per non-nullish value reached, with the schema that declares it.
   *
   * For a `z.lazy` schema this fires twice: once with the lazy wrapper (which is
   * the stable identity to compare against, e.g. `CriteriaGroupSchema`) and once
   * with the object it resolves to.
   */
  value?(schema: z.ZodTypeAny, data: unknown): void
}

/**
 * Strips the wrapper layers that carry no structural information, so callers can
 * compare against the schema instance actually declared in circe.types.ts.
 *
 * `z.lazy` is deliberately *not* unwrapped: it is the only stable reference for
 * a recursive schema, since its inner factory returns a fresh object each call.
 */
export function unwrapType(schema: z.ZodTypeAny): z.ZodTypeAny {
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
 * Walks `data` against `schema`, dispatching to the visitor as it goes.
 */
export function walkSchema(schema: z.ZodTypeAny, data: unknown, visitor: SchemaWalkVisitor): void {
  walkValue(schema, data, visitor)
}

function walkValue(schema: z.ZodTypeAny, data: unknown, visitor: SchemaWalkVisitor): void {
  if (data === null || data === undefined) return

  const type = unwrapType(schema)
  visitor.value?.(type, data)

  if (type instanceof z.ZodObject) {
    if (typeof data !== 'object') return
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
    // Polymorphic Jackson wrapper union: data is `{ WrapperKey: innerData }`.
    if (typeof data !== 'object') return
    const record = data as Record<string, unknown>
    const options: z.ZodTypeAny[] = type.options
    for (const wrapperKey of Object.keys(record)) {
      const option = options.find(
        (candidate): candidate is z.AnyZodObject => candidate instanceof z.ZodObject && wrapperKey in candidate.shape,
      )
      if (option) {
        // Existence of `wrapperKey` on `option.shape` was confirmed by the predicate above.
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

  // Leaf schema (string/number/boolean/enum/…) — nothing further to walk.
}

function walkObjectShape(
  schema: z.AnyZodObject,
  data: Record<string, unknown>,
  visitor: SchemaWalkVisitor,
): void {
  const shape: Record<string, z.ZodTypeAny> = schema.shape
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const unwrapped = unwrapType(fieldSchema)
    if (visitor.field?.(unwrapped, data, key) === true) continue
    walkValue(unwrapped, data[key], visitor)
  }
}
