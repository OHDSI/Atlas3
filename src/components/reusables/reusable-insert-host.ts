/**
 * reusable-insert-host.ts
 *
 * The expression a reusable is inserted into owns the concept set list, but
 * the buttons that insert sit deep inside it (a criteria group can be nested
 * many levels down). The editor that owns the list provides it here, and
 * every "From Reusable" button below injects it. Editors that provide nothing
 * get no such button.
 *
 * useCirceConceptSetPicker provides it for every editor that uses it, which
 * is every editor built on the circe criteria components.
 */
import { getCurrentInstance, inject, provide, type InjectionKey } from 'vue'
import type { ConceptSet } from '@/models/circe-types'

export interface ReusableInsertHost {
  getConceptSets: () => ConceptSet[]
  addConceptSet: (conceptSet: ConceptSet) => void
  /** Called after an insertion, for hosts that track which sets are in use. */
  onInserted?: () => void
}

const REUSABLE_INSERT_HOST: InjectionKey<ReusableInsertHost | null> = Symbol('reusable-insert-host')

export function provideReusableInsertHost(host: ReusableInsertHost | null): void {
  // Composables that provide this are also called from stores and tests,
  // outside any component setup, where there is nothing to provide to.
  if (!getCurrentInstance()) return
  provide(REUSABLE_INSERT_HOST, host)
}

export function useReusableInsertHost(): ReusableInsertHost | null {
  if (!getCurrentInstance()) return null
  return inject(REUSABLE_INSERT_HOST, null)
}
