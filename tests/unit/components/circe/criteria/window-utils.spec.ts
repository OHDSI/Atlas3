import { describe, it, expect, vi } from 'vitest'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

import {
  cloneWindow,
  createDefaultWindow,
  formatWindowExpression,
  getWindowPresetOptions,
} from '@/components/circe/criteria/window-utils'

describe('window-utils', () => {
  it('creates and clones windows without sharing nested endpoints', () => {
    const defaultWindow = createDefaultWindow()
    expect(defaultWindow).toEqual({
      Start: { Days: null, Coeff: -1 },
      End: { Days: null, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })

    const source = {
      Start: { Days: 7, Coeff: -1 },
      End: { Days: 14, Coeff: 1 },
      UseIndexEnd: true,
      UseEventEnd: false,
    }
    const cloned = cloneWindow(source)

    expect(cloned).toEqual(source)
    expect(cloned.Start).not.toBe(source.Start)
    expect(cloned.End).not.toBe(source.End)

    const normalized = cloneWindow({
      Start: null,
      End: undefined,
      UseIndexEnd: undefined,
      UseEventEnd: undefined,
    } as never)

    expect(normalized).toEqual({
      Start: { Days: null, Coeff: -1 },
      End: { Days: null, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })
  })

  it('formats window expressions and exposes the preset list', () => {
    expect(formatWindowExpression()).toBe('No window')
    expect(
      formatWindowExpression({
        Start: { Days: 30, Coeff: -1 },
        End: { Days: 0, Coeff: 1 },
        UseIndexEnd: false,
        UseEventEnd: false,
      })
    ).toBe('event starts between 30 days Before and 0 days After index start')
    expect(
      formatWindowExpression({
        Start: { Days: 1, Coeff: 1 },
        End: { Days: null, Coeff: -1 },
        UseIndexEnd: true,
        UseEventEnd: true,
      })
    ).toBe('event ends between 1 day After and all days Before index end')

    const presets = getWindowPresetOptions()
    expect(presets).toHaveLength(10)
    expect(presets[0].label).toContain('Short-term baseline')
    expect(presets[0].value.startWindow.Start.Days).toBe(30)
    expect(presets[9].value.endWindow?.UseIndexEnd).toBe(true)
  })
})