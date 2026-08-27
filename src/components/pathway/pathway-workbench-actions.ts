import type { PathwayExecution } from '@/models/pathway.types'

export async function refreshPathwayExecutions(input: {
  pathwayId: number | null | undefined
  selectedExecutionId: number | null | undefined
  listExecutions: (pathwayId: number) => Promise<{ success: boolean; data?: PathwayExecution[]; error?: unknown }>
  onExecutions: (executions: PathwayExecution[]) => void
  onLoading: (loading: boolean) => void
  onSelectExecution: (id: number) => void
  logError: (message: string, error?: unknown) => void
}): Promise<void> {
  if (!input.pathwayId) {
    input.onExecutions([])
    return
  }
  input.onLoading(true)
  try {
    const result = await input.listExecutions(input.pathwayId)
    if (result.success && Array.isArray(result.data)) {
      input.onExecutions(result.data)
      if (!input.selectedExecutionId) {
        const latestCompleted = result.data.find(execution => execution.status === 'COMPLETED')
        if (latestCompleted) input.onSelectExecution(latestCompleted.id)
      }
    } else {
      input.logError('PathwayWorkbench listPathwayExecutions failed', result.error)
    }
  } finally {
    input.onLoading(false)
  }
}

export async function runPathwayGeneration(input: {
  generation: { start: (sourceKey: string) => Promise<boolean>; error: { value: string | null } } | null
  sourceKey: string
  refreshExecutions: () => Promise<void>
  logError: (message: string, error?: unknown) => void
}): Promise<void> {
  if (!input.generation) return
  const ok = await input.generation.start(input.sourceKey)
  if (!ok) input.logError('PathwayWorkbench start failed', input.generation.error.value)
  await input.refreshExecutions()
}

export async function cancelPathwayGeneration(input: {
  generation: { cancel: (sourceKey: string) => Promise<boolean>; error: { value: string | null } } | null
  sourceKey: string
  refreshExecutions: () => Promise<void>
  logError: (message: string, error?: unknown) => void
}): Promise<void> {
  if (!input.generation) return
  const ok = await input.generation.cancel(input.sourceKey)
  if (!ok) input.logError('PathwayWorkbench cancel failed', input.generation.error.value)
  await input.refreshExecutions()
}

export async function maybeFetchPathwaySources(input: {
  sourceCount: number
  isLoading: boolean
  fetchDataSources: () => Promise<void>
}): Promise<void> {
  if (input.sourceCount === 0 && !input.isLoading) {
    await input.fetchDataSources()
  }
}