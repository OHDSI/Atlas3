import { computed, type Ref, type WritableComputedRef } from 'vue'

type OptionalFieldTarget = Record<string, any>

export function numberBinding(target: Readonly<Ref<OptionalFieldTarget>>, fieldKey: string): WritableComputedRef<number, number | string | null | undefined> {
  return computed({
    get: () => {
      const value = target.value[fieldKey]
      return value === null || value === undefined ? 0 : Number(value)
    },
    set: value => {
      target.value[fieldKey] = value === '' || value === null || value === undefined ? 0 : Number(value)
    },
  })
}

export function optionalNumberBinding(target: Readonly<Ref<OptionalFieldTarget>>, fieldKey: string): WritableComputedRef<number | string | null | undefined> {
  return computed({
    get: () => target.value[fieldKey],
    set: value => {
      target.value[fieldKey] = value === '' || value === null || value === undefined ? undefined : Number(value)
    },
  })
}

export function optionalTextBinding(target: Readonly<Ref<OptionalFieldTarget>>, fieldKey: string): WritableComputedRef<string | null | undefined> {
  return computed({
    get: () => target.value[fieldKey],
    set: value => {
      target.value[fieldKey] = value === '' || value === null || value === undefined ? undefined : String(value)
    },
  })
}