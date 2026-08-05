import { describe, it, expect } from 'vitest'
import { isPluginReportType, parsePluginReportType } from '@/models/datasource.types'

describe('plugin report type helpers', () => {
  it('recognises a plugin report type', () => {
    expect(isPluginReportType('plugin:p1:my-report')).toBe(true)
  })

  it('rejects a core report type', () => {
    expect(isPluginReportType('dashboard')).toBe(false)
  })

  it('rejects a malformed value with too few segments', () => {
    expect(isPluginReportType('plugin:p1')).toBe(false)
  })

  it('parses plugin and item ids', () => {
    expect(parsePluginReportType('plugin:p1:my-report')).toEqual({
      pluginId: 'p1',
      itemId: 'my-report',
    })
  })
})
