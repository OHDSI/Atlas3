import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { IncidenceRate, IncidenceRateExpression } from '@/models/incidence-rate.types'

const { httpPut } = vi.hoisted(() => ({ httpPut: vi.fn() }))

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut,
  httpDelete: vi.fn(),
  httpPostRead: vi.fn(),
}))

const timeAtRisk = {
  start: { DateField: 'StartDate', Offset: 0 },
  end: { DateField: 'EndDate', Offset: 0 },
} satisfies IncidenceRateExpression['timeAtRisk']

describe('criteria groups leaving through the strata save paths', () => {
  beforeEach(() => vi.clearAllMocks())

  it('characterization strata reach the wire with Type and Count', async () => {
    const design: CharacterizationDefinition = {
      id: 1,
      name: 'c',
      cohorts: [],
      featureAnalyses: [],
      stratas: [{ id: '9', name: 's', criteria: { Type: 'AT_LEAST' } }],
    }
    httpPut.mockResolvedValue({ ...design, stratas: [] })
    const { updateCharacterization } = await import('@/services/characterization.service')

    await updateCharacterization(design)

    const sent = httpPut.mock.calls[0]![1] as { stratas: Array<{ criteria: { Type: string; Count: number } }> }
    expect(sent.stratas[0]!.criteria).toEqual({ Type: 'AT_LEAST', Count: 0 })
  })

  it('incidence rate stratify rules reach the wire with Type and Count', async () => {
    const ir: IncidenceRate = {
      id: 1,
      name: 'ir',
      expression: {
        ConceptSets: [],
        targetIds: [],
        outcomeIds: [],
        timeAtRisk,
        strata: [{ name: 'r', expression: { Type: 'AT_MOST' } }],
      },
      tags: [],
    }
    httpPut.mockResolvedValue({
      id: ir.id,
      name: ir.name,
      tags: [],
      expression: JSON.stringify({ ...ir.expression, strata: [] }),
    })
    const { saveIncidenceRate } = await import('@/services/incidence-rate.service')

    await saveIncidenceRate(1, ir)

    const sent = httpPut.mock.calls[0]![1] as { expression: string }
    const expression = JSON.parse(sent.expression) as { strata: Array<{ expression: { Type: string; Count: number } }> }
    expect(expression.strata[0]!.expression).toEqual({ Type: 'AT_MOST', Count: 0 })
  })
})
