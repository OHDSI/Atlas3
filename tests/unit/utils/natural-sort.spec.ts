import { describe, it, expect } from 'vitest'
import { compareNatural } from '@/utils/natural-sort'

describe('compareNatural', () => {
  it('orders embedded numbers by value and ignores case', () => {
    expect(['age group: 45 - 49', 'Age group: 5 - 9', 'age group: 0 - 4'].sort(compareNatural)).toEqual([
      'age group: 0 - 4',
      'Age group: 5 - 9',
      'age group: 45 - 49',
    ])
  })

  it('sorts missing values first', () => {
    expect(['b', null, 'a'].sort(compareNatural)).toEqual([null, 'a', 'b'])
  })
})
