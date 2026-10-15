import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_DIALECTS,
  TreemapNodeSchema,
  isPluginReportType,
  parsePluginReportType,
} from '@/models/datasource.types'

describe('SUPPORTED_DIALECTS', () => {
  it('matches WebAPI DBMSType OHDSI dialect identifiers', () => {
    expect(SUPPORTED_DIALECTS.map(dialect => dialect.value)).toEqual([
      'postgresql',
      'sql server',
      'oracle',
      'redshift',
      'bigquery',
      'impala',
      'pdw',
      'netezza',
      'hive',
      'spark',
      'snowflake',
      'synapse',
    ])
  })
})

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

describe('TreemapNodeSchema', () => {
  it('parses nested nodes', () => {
    expect(TreemapNodeSchema.parse({
      name: 'All people',
      value: 10,
      children: [{ name: 'Female', value: 6 }],
    })).toMatchObject({ name: 'All people', children: [{ name: 'Female' }] })
  })
})
