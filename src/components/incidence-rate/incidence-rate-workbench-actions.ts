export async function syncIncidenceRateSelection(input: {
  currentIRId: number | null | undefined
  previousIRId: number | null | undefined
  executions: Array<{ id: number; status: string }>
  selectedExecutionId: number | null
  executionById: (id: number) => { status: string } | null
  currentTargetIds: number[]
  currentOutcomeIds: number[]
  selectedTargetId: number | null
  setSelectedTargetOutcome: (targetId: number, outcomeId: number | null) => void
  clearRunQuery: () => Promise<void>
  replaceRunQuery: (runId: number) => Promise<void>
  pollOnceForNewDesign: (id: number) => Promise<void>
}): Promise<void> {
  const { currentIRId, executions, selectedExecutionId } = input
  if (currentIRId == null) return

  if (input.previousIRId !== currentIRId) {
    await input.pollOnceForNewDesign(currentIRId)
    const defaultExecution = executions[0] ?? null
    if (defaultExecution) {
      await input.replaceRunQuery(defaultExecution.id)
    } else {
      await input.clearRunQuery()
    }
    return
  }

  if (selectedExecutionId === null || !input.executionById(selectedExecutionId)) {
    const defaultExecution = executions[0] ?? null
    if (defaultExecution) {
      await input.replaceRunQuery(defaultExecution.id)
    } else {
      await input.clearRunQuery()
    }
  }

  if (input.selectedTargetId === null && input.currentTargetIds.length) {
    input.setSelectedTargetOutcome(input.currentTargetIds[0]!, input.currentOutcomeIds[0] ?? null)
  }
}

export async function runIncidenceRateSource(input: {
  currentIRId: number | null | undefined
  sourceKey: string
  start: (irId: number, sourceKey: string) => Promise<void>
}): Promise<void> {
  if (input.currentIRId == null) return
  await input.start(input.currentIRId, input.sourceKey)
}

export async function cancelIncidenceRateSource(input: {
  currentIRId: number | null | undefined
  sourceKey: string
  cancel: (irId: number, sourceKey: string) => Promise<void>
}): Promise<void> {
  if (input.currentIRId == null) return
  await input.cancel(input.currentIRId, input.sourceKey)
}

export function selectIncidenceRateFromHistory(input: {
  onSelectRun: (id: number) => void
  setHistoryOpen: (open: boolean) => void
}): (id: number | string) => void {
  return (id: number | string) => {
    input.setHistoryOpen(false)
    if (typeof id === 'number') input.onSelectRun(id)
    else {
      const parsed = Number(id)
      if (Number.isFinite(parsed)) input.onSelectRun(parsed)
    }
  }
}

export async function maybeFetchIncidenceRateSources(input: {
  sourceCount: number
  isLoading: boolean
  fetchDataSources: () => Promise<void>
}): Promise<void> {
  if (input.sourceCount === 0 && !input.isLoading) {
    await input.fetchDataSources()
  }
}