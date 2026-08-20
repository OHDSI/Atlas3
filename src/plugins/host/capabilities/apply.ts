import { translateCapability } from './translate'
import { applyProposalDirect } from '@/plugins/host/pythiaBridge'
import { logger } from '@/utils/logger'

export interface ApplyResult {
  applied: boolean
  kind?: string
  id?: number | string
  name?: string
}

export async function applyCapability(
  name: string,
  args: Record<string, unknown>
): Promise<ApplyResult> {
  const proposal = translateCapability(name, args)
  if (!proposal) return { applied: false }
  try {
    const res = await applyProposalDirect(proposal)
    if (res?.applied === false) return { applied: false, kind: (proposal as { kind: string }).kind }
    return { applied: true, kind: (proposal as { kind: string }).kind, id: res?.id, name: res?.name }
  } catch (err) {
    logger.error('capabilities', `applyCapability failed for "${name}"`, err)
    return { applied: false, kind: (proposal as { kind: string }).kind }
  }
}
