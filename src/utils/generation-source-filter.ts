import type {
  RunTableExecution,
  RunTableSource,
} from '@/components/generation/DataSourceRunTable.vue'

export function filterGeneratedSources(
  sources: RunTableSource[],
  executions: RunTableExecution[]
): RunTableSource[] {
  const generatedSourceKeys = new Set(
    executions
      .filter(execution => execution.status === 'COMPLETED')
      .map(execution => execution.sourceKey)
  )
  return sources.filter(source => generatedSourceKeys.has(source.sourceKey))
}
