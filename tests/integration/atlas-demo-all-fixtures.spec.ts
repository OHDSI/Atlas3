import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

const DIR = join(__dirname, '..', 'e2e', 'fixtures', 'atlas-demo')

const files = readdirSync(DIR)
  .filter(f => f.startsWith('cohort-') && f.endsWith('.json') && !f.includes('definitions'))
  .sort()

describe('All Atlas Demo Cohorts Convert Without Error', () => {
  files.forEach(file => {
    it(file, () => {
      const atlas = JSON.parse(readFileSync(join(DIR, file), 'utf-8'))
      const internal = convertAtlasToInternal(atlas)
      const rt = convertInternalToAtlas({
        ...internal,
        name: 'test',
        entryEvents: internal.entryEvents || [],
        qualifyingLimit: internal.qualifyingLimit || 'ALL',
        inclusionRules: internal.inclusionRules || [],
        conceptSets: internal.conceptSets || [],
      } as CohortDefinition)
      expect(rt).toBeDefined()
    })
  })
})
