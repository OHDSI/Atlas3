import { inject, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export const CONCEPT_SET_EDITOR_SUPPRESSED: InjectionKey<Ref<boolean>> = Symbol('conceptSetEditorSuppressed')

export function useConceptSetEditorSuppressed(): Ref<boolean> {
  return inject(CONCEPT_SET_EDITOR_SUPPRESSED, ref(false))
}
