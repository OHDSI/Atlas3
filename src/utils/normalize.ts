/**
 * Recursively fills null or missing values in `target` from `defaults`.
 *
 * This function mutates `target` in place and returns the same object.
 *
 * Rules:
 * - Plain objects are recursively normalized.
 * - Arrays are treated as complete values and are not merged by index.
 * - `undefined` is treated as missing.
 * - `null` is treated as missing when a default exists.
 * - Existing non-null values take precedence over defaults.
 * - Properties that exist only on the target are preserved.
 * - Default objects/arrays are cloned before being assigned so callers
 *   never share mutable structures from the defaults object.
 *
 * `T` describes the normalized shape guaranteed by the defaults.
 */
export function normalizeDefaults<T>(
  defaults: T,
  target: unknown,
): T {
  if (!isPlainObject(target)) {
    throw new TypeError('normalizeDefaults target must be an object')
  }

  if (!isPlainObject(defaults)) {
    throw new TypeError('normalizeDefaults defaults must be an object')
  }

  normalizeObject(defaults, target)

  return target as T
}

function normalizeObject(
  defaults: Record<string, unknown>,
  target: Record<string, unknown>,
): void {
  for (const [key, fallback] of Object.entries(defaults)) {
    const current = target[key]

    if (current == null) {
      target[key] = cloneValue(fallback)
      continue
    }

    if (
      isPlainObject(fallback) &&
      isPlainObject(current)
    ) {
      normalizeObject(fallback, current)
    }
  }
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return (
    prototype === Object.prototype ||
    prototype === null
  )
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item =>
      cloneValue(item),
    ) as T
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          cloneValue(item),
        ],
      ),
    ) as T
  }

  return value
}