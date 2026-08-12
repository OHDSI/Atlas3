import { describe, it, expect, vi } from 'vitest'

describe('main.ts bootstrap', () => {
  it('applies the resolved theme to the chart palette at bootstrap', async () => {
    const setChartTheme = vi.fn()
    vi.resetModules()
    vi.doMock('@/ui/chart-config', () => ({ setChartPalette: vi.fn(), setChartTheme }))
    await import('@/main')
    await vi.waitFor(() => expect(setChartTheme).toHaveBeenCalledWith('light'))
    vi.doUnmock('@/ui/chart-config')
  })
})
