import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

import { numberBinding, optionalNumberBinding, optionalTextBinding } from '@/components/circe/input/bindings'

describe('bindings', () => {
  it('binds numbers with zero defaults and nullish clearing', () => {
    const state = ref<Record<string, number | string | null | undefined>>({ Age: undefined })
    const binding = numberBinding(state, 'Age')

    expect(binding.value).toBe(0)
    binding.value = '18'
    expect(state.value.Age).toBe(18)
    binding.value = ''
    expect(state.value.Age).toBe(0)
  })

  it('binds optional numbers and optional text values', () => {
    const state = ref<Record<string, number | string | null | undefined>>({ Count: null, Label: 42 })
    const countBinding = optionalNumberBinding(state, 'Count')
    const labelBinding = optionalTextBinding(state, 'Label')

    expect(countBinding.value).toBeUndefined()
    countBinding.value = '7'
    expect(state.value.Count).toBe(7)
    countBinding.value = undefined
    expect(state.value.Count).toBeUndefined()

    expect(labelBinding.value).toBe('42')
    labelBinding.value = 'updated'
    expect(state.value.Label).toBe('updated')
    labelBinding.value = ''
    expect(state.value.Label).toBeUndefined()
  })
})

describe('non-numeric input', () => {
  // Number('abc') is NaN, which JSON.stringify writes as null. circe reads a
  // null Days as an unbounded window, so a garbage keystroke would silently
  // widen the criterion instead of being rejected.
  it('numberBinding leaves the previous value alone', () => {
    const target = ref<Record<string, number | string | null | undefined>>({ StartOffset: 5 })
    const binding = numberBinding(target, 'StartOffset')
    binding.value = 'abc'
    expect(target.value.StartOffset).toBe(5)
  })

  it('optionalNumberBinding leaves the previous value alone', () => {
    const target = ref<Record<string, number | string | null | undefined>>({ Value: 5 })
    const binding = optionalNumberBinding(target, 'Value')
    binding.value = 'abc'
    expect(target.value.Value).toBe(5)
  })

  it('optionalNumberBinding still clears on an empty string', () => {
    const target = ref<Record<string, number | string | null | undefined>>({ Value: 5 })
    const binding = optionalNumberBinding(target, 'Value')
    binding.value = ''
    expect(target.value.Value).toBeUndefined()
  })
})
