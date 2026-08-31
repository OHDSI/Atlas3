/**
 * A freshly imported analysis has to be editable without a page reload, the
 * same as one created through the editor (#274, #268). Import was the one
 * creation path e471360f did not wrap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/http-client', () => ({
  httpClient: vi.fn(),
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
  httpPostRead: vi.fn(),
}))

import { httpPost } from '@/services/http-client'
import { useAuthStore } from '@/stores/auth'
import { importCharacterization } from '@/services/characterization.service'
import { importIncidenceRate } from '@/services/incidence-rate.service'
import { importPathway } from '@/services/pathway.service'

const post = vi.mocked(httpPost)

describe('import refreshes entity access (#267)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('refreshes the user after importing a characterization', async () => {
    const auth = useAuthStore()
    const refresh = vi.spyOn(auth, 'refreshUser').mockResolvedValue({} as never)
    post.mockResolvedValue({ id: 1, name: 'CC', cohorts: [], featureAnalyses: [] })

    await importCharacterization({})

    expect(refresh).toHaveBeenCalled()
  })

  it('refreshes the user after importing an incidence rate', async () => {
    const auth = useAuthStore()
    const refresh = vi.spyOn(auth, 'refreshUser').mockResolvedValue({} as never)
    post.mockResolvedValue({
      id: 2,
      name: 'IR',
      expression: JSON.stringify({
        timeAtRisk: {
          start: { DateField: 'StartDate', Offset: 0 },
          end: { DateField: 'StartDate', Offset: 0 },
        },
      }),
    })

    await importIncidenceRate({})

    expect(refresh).toHaveBeenCalled()
  })

  it('refreshes the user after importing a pathway', async () => {
    const auth = useAuthStore()
    const refresh = vi.spyOn(auth, 'refreshUser').mockResolvedValue({} as never)
    post.mockResolvedValue({ id: 3, name: 'PW' })

    await importPathway({})

    expect(refresh).toHaveBeenCalled()
  })
})
