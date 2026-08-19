import { computed, type Ref, type WritableComputedRef } from 'vue'

type OptionalFieldTarget = Record<string, number | string | null | undefined>

function isCleared(value: number | string | null | undefined): boolean {
  return value === '' || value === null || value === undefined
}

function toFiniteNumber(value: number | string | null | undefined): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
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
      if (isCleared(value)) {
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
      if (isCleared(value)) {
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