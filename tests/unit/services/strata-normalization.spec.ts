import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { IncidenceRate } from '@/models/incidence-rate.types'

const { httpPut } = vi.hoisted(() => ({ httpPut: vi.fn() }))

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut,
  httpDelete: vi.fn(),
  httpPostRead: vi.fn(),
}))

describe('criteria groups leaving through the strata save paths', () => {
  beforeEach(() => vi.clearAllMocks())

  it('characterization strata reach the wire with Type and Count', async () => {
    httpPut.mockResolvedValue({ id: 1, name: 'c', stratas: [], cohorts: [], featureAnalyses: [], parameters: [] })
    const { updateCharacterization } = await import('@/services/characterization.service')

    await updateCharacterization({
      id: 1,
      name: 'c',
      stratas: [{ id: '9', name: 's', criteria: { Type: 'AT_LEAST' } }],
    } as unknown as CharacterizationDefinition)

    const sent = httpPut.mock.calls[0]![1] as { stratas: Array<{ criteria: { Type: string; Count: number } }> }
    expect(sent.stratas[0]!.criteria).toEqual({ Type: 'AT_LEAST', Count: 0 })
  })

  it('incidence rate stratify rules reach the wire with Type and Count', async () => {
    httpPut.mockResolvedValue({ id: 1, name: 'ir', expression: '{}' })
    const { saveIncidenceRate } = await import('@/services/incidence-rate.service')

    await saveIncidenceRate(1, {
      id: 1,
      name: 'ir',
      expression: {
        ConceptSets: [], targetIds: [], outcomeIds: [],
        timeAtRisk: { startWith: 'start', startOffset: 0, endWith: 'end', endOffset: 0 },
        strata: [{ name: 'r', expression: { Type: 'AT_MOST' } }],
      },
      tags: [],
    } as unknown as IncidenceRate)

    const sent = httpPut.mock.calls[0]![1] as { expression: string }
    const expression = JSON.parse(sent.expression) as { strata: Array<{ expression: { Type: string; Count: number } }> }
    expect(expression.strata[0]!.expression).toEqual({ Type: 'AT_MOST', Count: 0 })
  })
})
