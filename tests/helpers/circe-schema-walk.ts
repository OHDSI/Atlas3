import { z } from 'zod'

/**
 * `z.lazy(() => …)` calls its getter on every `.schema` access, handing back a fresh
 * schema instance each time. Callers key visited-sets, labels and recursion depth on
 * schema identity, so the resolved instance has to be memoised or recursive schemas
 * expand forever.
 */
const lazyCache = new Map<z.ZodTypeAny, z.ZodTypeAny>()

export function resolveLazy(lazy: z.ZodLazy<z.ZodTypeAny>): z.ZodTypeAny {
  const cached = lazyCache.get(lazy)
  if (cached) return cached
  const inner = lazy.schema as z.ZodTypeAny
  lazyCache.set(lazy, inner)
  return inner
}

export function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema
  for (;;) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) current = current.unwrap()
    else if (current instanceof z.ZodDefault) current = current.removeDefault()
    else if (current instanceof z.ZodEffects) current = current.innerType()
    else if (current instanceof z.ZodLazy) current = resolveLazy(current)
    else return current
  }
}

export function isObjectSchema(schema: z.ZodTypeAny): schema is z.ZodObject<z.ZodRawShape> {
  return schema instanceof z.ZodObject
}

export function shapeOf(schema: z.ZodObject<z.ZodRawShape>): Record<string, z.ZodTypeAny> {
  return schema.shape as Record<string, z.ZodTypeAny>
}

/**
 * How deep a recursive schema may be re-entered. Two is enough to reach the slots that
 * only exist under nesting (a criteria group inside a criteria group), and stops the
 * CriteriaGroup/CorelatedCriteria/Criteria cycle from expanding without bound.
 */
export const MAX_RECURSION = 2

/**
 * Produces the leaf values `synthesise` writes. `path` is the dotted position of the
 * leaf in the generated value, with `[]` for array entries, so a caller can make each
 * leaf traceable back to where it was placed.
 */
export interface SynthesisScalars {
  number?(path: string, variant: number): number
  string?(path: string, variant: number): string
  boolean?(path: string, variant: number): boolean
}

export interface SynthesisOptions {
  /** Selects which arm of each union and which member of each enum is taken. */
  variant: number
  scalars?: SynthesisScalars
}

/**
 * Builds a value for `schema` from its Zod type alone, populating every field of every
 * object it reaches. Running every variant covers all union arms and enum members.
 */
export function synthesise(schema: z.ZodTypeAny, options: SynthesisOptions): unknown {
  const { variant, scalars } = options
  const numberOf = scalars?.number ?? ((_path: string, seed: number) => seed + 1)
  const stringOf = scalars?.string ?? ((_path: string, seed: number) => `synthetic-${seed}`)
  const booleanOf = scalars?.boolean ?? ((_path: string, seed: number) => seed % 2 === 0)

  const build = (current: z.ZodTypeAny, seen: ReadonlyMap<z.ZodTypeAny, number>, path: string): unknown => {
    const depths = new Map(seen)
    let type = current
    for (;;) {
      if (type instanceof z.ZodOptional || type instanceof z.ZodNullable) type = type.unwrap()
      else if (type instanceof z.ZodDefault) type = type.removeDefault()
      else if (type instanceof z.ZodEffects) type = type.innerType()
      else if (type instanceof z.ZodLazy) {
        const depth = depths.get(type) ?? 0
        if (depth >= MAX_RECURSION) return undefined
        depths.set(type, depth + 1)
        type = resolveLazy(type)
      } else break
    }

    if (isObjectSchema(type)) {
      const value: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(shapeOf(type))) {
        const fieldValue = build(field, depths, path ? `${path}.${key}` : key)
        if (fieldValue !== undefined) value[key] = fieldValue
      }
      return value
    }
    if (type instanceof z.ZodArray) {
      const item = build(type.element as z.ZodTypeAny, depths, `${path}[]`)
      return item === undefined ? [] : [item]
    }
    if (type instanceof z.ZodUnion) {
      const arms = type.options as z.ZodTypeAny[]
      return build(arms[variant % arms.length]!, depths, path)
    }
    if (type instanceof z.ZodIntersection) {
      const left = build(type._def.left as z.ZodTypeAny, depths, path)
      const right = build(type._def.right as z.ZodTypeAny, depths, path)
      return { ...(left as object), ...(right as object) }
    }
    if (type instanceof z.ZodEnum) {
      const members = type.options as string[]
      return members[variant % members.length]
    }
    if (type instanceof z.ZodString) return stringOf(path, variant)
    if (type instanceof z.ZodNumber) return numberOf(path, variant)
    if (type instanceof z.ZodBoolean) return booleanOf(path, variant)
    return undefined
  }

  return build(schema, new Map(), '')
}
