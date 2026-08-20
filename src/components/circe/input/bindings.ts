import { computed, type Ref, type WritableComputedRef } from 'vue'

type OptionalFieldTarget = Record<string, number | string | null | undefined>

/**
 * The two halves of the numeric-input convention every circe number field
 * follows: a cleared field means "use the documented default", while input that
 * is not a finite number is rejected outright so the previous value stands.
 * `Number(value) || 0` conflates the two and silently writes 0 for junk.
 */
export function isClearedInput(value: number | string | null | undefined): boolean {
  return value === '' || value === null || value === undefined
}

export function toFiniteNumber(value: number | string | null | undefined): number | undefined {
  if (isClearedInput(value)) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function numberBinding(target: Readonly<Ref<OptionalFieldTarget>>, fieldKey: string): WritableComputedRef<number, number | string | null | undefined> {
  return computed({
    get: () => {
      const value = target.value[fieldKey]
      return value === null || value === undefined ? 0 : Number(value)
    },
    set: value => {
      if (isClearedInput(value)) {
        target.value[fieldKey] = 0
        return
      }
      const parsed = toFiniteNumber(value)
      if (parsed === undefined) return
      target.value[fieldKey] = parsed
    },
  })
}

export function optionalNumberBinding(target: Readonly<Ref<OptionalFieldTarget>>, fieldKey: string): WritableComputedRef<number | string | undefined> {
  return computed({
    get: () => target.value[fieldKey] ?? undefined,
    set: value => {
      if (isClearedInput(value)) {
        target.value[fieldKey] = undefined
        return
      }
      const parsed = toFiniteNumber(value)
      if (parsed === undefined) return
      target.value[fieldKey] = parsed
    },
  })
}

export function optionalTextBinding(target: Readonly<Ref<OptionalFieldTarget>>, fieldKey: string): WritableComputedRef<string | undefined> {
  return computed({
    get: () => {
      const value = target.value[fieldKey]
      return value === null || value === undefined ? undefined : String(value)
    },
    set: value => {
      target.value[fieldKey] = value === '' || value === null || value === undefined ? undefined : String(value)
    },
  })
}