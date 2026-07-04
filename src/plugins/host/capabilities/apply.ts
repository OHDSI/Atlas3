import { translateCapability } from './translate'
import { applyProposalDirect } from '@/plugins/host/pythiaBridge'

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
  const res = await applyProposalDirect(proposal)
  return { applied: true, kind: (proposal as { kind: string }).kind, id: res?.id, name: res?.name }
}
