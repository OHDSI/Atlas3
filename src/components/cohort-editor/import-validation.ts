/**
 * import-validation.ts
 *
 * Validation for cohort expression JSON arriving from outside the editor —
 * pasted into the JSON dialog, or uploaded from the cohort list.
 *
 * `CohortExpressionSchema.safeParse` alone is not enough to tell a user their
 * file is wrong. Zod objects are non-strict by default, so a field the schema
 * does not declare is dropped rather than reported: a rule written
 * `{"title": "Female"}` instead of `{"name": "Female"}` parses successfully,
 * loses its title, and imports as a nameless rule. That is the "import is
 * partial and the user is not alerted" case in #328 — the JSON is structurally
 * valid, so nothing objects, and the loss only shows up later in the editor.
 *
 * Rejecting unrecognized fields catches the whole class of renamed and
 * misspelled keys rather than just the one reported. It is safe to be this
 * strict: every one of the 1104 cohorts in the OHDSI phenotype library
 * fixture, and all 38 atlas-demo exports, parse with zero unrecognized fields,
 * so a real Atlas export has nothing extra for this to trip over.
 */
import { z } from 'zod'
import { CohortExpressionSchema, type CohortExpression } from '@/models/circe-types'
import { unwrapType } from './schema-walk'

/** A single reason an imported expression was refused, as a displayable line. */
export interface ImportProblem {
  /** Dotted/indexed path to the offending value, e.g. `InclusionRules[0].title`. */
  path: string
  /** What is wrong, already human-readable. */
  message: string
  /** Declared field this looks like a misspelling of, when one is close enough. */
  suggestion?: string
}

export type ImportValidation =
  | { ok: true; expression: CohortExpression }
  | { ok: false; problems: ImportProblem[] }

/**
 * Validates `data` as a cohort expression, reporting both the fields the schema
 * rejects and the fields it does not recognise.
 */
export function validateCohortExpression(data: unknown): ImportValidation {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      ok: false,
      problems: [{ path: '', message: 'Expression must be a JSON object.' }],
    }
  }

  // Unrecognized fields first: when a key is misspelled the schema usually also
  // reports the correctly-spelled one as missing, and "unrecognized: title" is
  // the more useful of the two messages.
  const unrecognized: ImportProblem[] = []
  collectUnrecognized(CohortExpressionSchema, data, '', unrecognized)
  if (unrecognized.length > 0) return { ok: false, problems: unrecognized }

  const result = CohortExpressionSchema.safeParse(data)
  if (!result.success) {
    return {
      ok: false,
      problems: result.error.issues.map((issue) => ({
        path: formatPath(issue.path),
        message: issue.message,
      })),
    }
  }

  return { ok: true, expression: result.data }
}

/** Renders problems as the lines shown to the user, most specific first. */
export function describeImportProblems(problems: ImportProblem[]): string[] {
  return problems.map((problem) => {
    const where = problem.path ? `${problem.path}: ` : ''
    const hint = problem.suggestion ? ` (did you mean "${problem.suggestion}"?)` : ''
    return `${where}${problem.message}${hint}`
  })
}

function formatPath(path: (string | number)[]): string {
  return path.reduce<string>(
    (acc, segment) =>
      typeof segment === 'number' ? `${acc}[${segment}]` : acc ? `${acc}.${segment}` : String(segment),
    ''
  )
}

function join(path: string, key: string): string {
  return path ? `${path}.${key}` : key
}

/**
 * Walks `data` against `schema` collecting keys the schema does not declare.
 *
 * This mirrors `walkSchema`, but drives the traversal from the data rather than
 * from the schema — the point is to find keys the schema has never heard of,
 * which a schema-driven walk cannot see by construction.
 */
function collectUnrecognized(
  schema: z.ZodTypeAny,
  data: unknown,
  path: string,
  out: ImportProblem[]
): void {
  if (data === null || data === undefined) return

  const type = unwrapType(schema)

  if (type instanceof z.ZodLazy) {
    collectUnrecognized(type.schema, data, path, out)
    return
  }

  if (type instanceof z.ZodArray) {
    if (!Array.isArray(data)) return
    data.forEach((item, index) => collectUnrecognized(type.element, item, `${path}[${index}]`, out))
    return
  }

  if (type instanceof z.ZodRecord) {
    if (typeof data !== 'object' || Array.isArray(data)) return
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      collectUnrecognized(type.valueSchema, value, join(path, key), out)
    }
    return
  }

  if (type instanceof z.ZodUnion) {
    if (typeof data !== 'object' || Array.isArray(data)) return
    // Jackson-style wrapper union (`{ ConditionOccurrence: {...} }`): the
    // branch is chosen by the wrapper key, so an unknown wrapper key means the
    // criterion type itself is unrecognized rather than one of its fields.
    const options = type.options as z.ZodTypeAny[]
    const objectOptions = options.filter(
      (option): option is z.AnyZodObject => unwrapType(option) instanceof z.ZodObject
    )
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const match = objectOptions.find((option) => key in (unwrapType(option) as z.AnyZodObject).shape)
      if (!match) {
        out.push({
          path: join(path, key),
          message: 'unrecognized field',
          suggestion: closestKey(
            key,
            objectOptions.flatMap((option) => Object.keys((unwrapType(option) as z.AnyZodObject).shape))
          ),
        })
        continue
      }
      const shape = (unwrapType(match) as z.AnyZodObject).shape as Record<string, z.ZodTypeAny>
      const inner = shape[key]
      if (inner) collectUnrecognized(inner, value, join(path, key), out)
    }
    return
  }

  if (type instanceof z.ZodObject) {
    if (typeof data !== 'object' || Array.isArray(data)) return
    const shape = type.shape as Record<string, z.ZodTypeAny>
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const declared = shape[key]
      if (!declared) {
        out.push({
          path: join(path, key),
          message: 'unrecognized field',
          suggestion: closestKey(key, Object.keys(shape)),
        })
        continue
      }
      collectUnrecognized(declared, value, join(path, key), out)
    }
  }
}

/**
 * Nearest declared field to `key`, when one is close enough to be worth
 * suggesting. A case-insensitive match wins outright; otherwise an edit
 * distance of at most a third of the name's length keeps "titel"/"title"
 * together without pairing unrelated short keys like "Op" and "Id".
 *
 * The distance counts a transposition as one edit rather than two, so the
 * common "nmae" slip stays within the budget for a name as short as "name".
 */
function closestKey(key: string, candidates: string[]): string | undefined {
  const lowered = key.toLowerCase()
  const sameLetters = candidates.find((candidate) => candidate.toLowerCase() === lowered)
  if (sameLetters) return sameLetters

  let best: string | undefined
  let bestDistance = Infinity
  for (const candidate of candidates) {
    const distance = editDistance(lowered, candidate.toLowerCase())
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  if (best === undefined) return undefined
  return bestDistance <= Math.max(1, Math.floor(best.length / 3)) ? best : undefined
}

/** Optimal string alignment distance: Levenshtein plus adjacent transposition. */
function editDistance(a: string, b: string): number {
  const width = b.length + 1
  // Flat buffer so every read is a plain number, not a possibly-undefined cell.
  const dist = new Array<number>((a.length + 1) * width).fill(0)
  const at = (i: number, j: number): number => dist[i * width + j] as number
  const set = (i: number, j: number, value: number): void => {
    dist[i * width + j] = value
  }

  for (let j = 0; j <= b.length; j++) set(0, j, j)
  for (let i = 0; i <= a.length; i++) set(i, 0, i)

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1)
      }
      set(i, j, best)
    }
  }

  return at(a.length, b.length)
}
