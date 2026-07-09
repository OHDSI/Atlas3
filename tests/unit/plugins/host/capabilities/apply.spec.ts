import { describe, it, expect, vi } from 'vitest'

vi.mock('@/plugins/host/pythiaBridge', () => ({
  applyProposalDirect: vi.fn().mockResolvedValue({ id: 7, name: 'X' }),
}))

import { applyCapability } from '@/plugins/host/capabilities/apply'
import { applyProposalDirect } from '@/plugins/host/pythiaBridge'

describe('applyCapability', () => {
  it('translates then applies, returning kind + id', async () => {
    const r = await applyCapability('set_observation_window', { priorDays: 365, postDays: 0 })
    expect(applyProposalDirect).toHaveBeenCalled()
    expect(r).toMatchObject({ applied: true, kind: 'setObservationPeriod', id: 7 })
  })

  it('returns applied:false when translation yields null', async () => {
    const r = await applyCapability('set_entry_event', {})
    expect(r.applied).toBe(false)
  })

  it('resolves applied:false instead of rejecting when applyProposalDirect throws', async () => {
    vi.mocked(applyProposalDirect).mockRejectedValueOnce(new Error('boom'))
    await expect(
      applyCapability('set_observation_window', { priorDays: 365, postDays: 0 })
    ).resolves.toMatchObject({ applied: false })
  })
})
