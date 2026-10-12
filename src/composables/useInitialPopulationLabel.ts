/**
 * Custom label for the "Initial population" step of a cohort's inclusion
 * report (funnel, attrition table, CSV). Kept per cohort in this browser's
 * localStorage only; it is a presentation preference, not part of the
 * cohort definition.
 */
import { ref, watch, type Ref } from 'vue'
import { logger } from '@/utils/logger'

const KEY_PREFIX = 'atlas.inclusionReport.initialLabel.'

function read(cohortId: number): string {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${cohortId}`) ?? ''
  } catch (error) {
    logger.warn('InitialPopulationLabel', 'Failed to read label', error)
    return ''
  }
}

function write(cohortId: number, label: string): void {
  try {
    const key = `${KEY_PREFIX}${cohortId}`
    if (label.trim()) {
      localStorage.setItem(key, label)
    } else {
      localStorage.removeItem(key)
    }
  } catch (error) {
    logger.warn('InitialPopulationLabel', 'Failed to save label', error)
  }
}

export function useInitialPopulationLabel(cohortId: Ref<number>) {
  const label = ref(read(cohortId.value))

  watch(cohortId, id => {
    label.value = read(id)
  })

  function setLabel(value: string) {
    label.value = value
    write(cohortId.value, value)
  }

  return { label, setLabel }
}
