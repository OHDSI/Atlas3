/**
 * Composable for managing match type selection in criteria groups
 * Extracts match type dialog logic from CriteriaGroupEditor.vue
 */
import { ref, type Ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { CriteriaGroup, LogicType } from '@/models/cohort.types'

export interface UseMatchTypeOptions {
  /** The criteria group ref to manage */
  group: Ref<CriteriaGroup>
  /** Callback when match type is confirmed */
  onUpdate: () => void
}

export interface UseMatchTypeReturn {
  /** Whether the match type dialog is open */
  showMatchTypeDialog: Ref<boolean>
  /** Temporary match type selection */
  matchTypeTemp: Ref<string>
  /** Temporary count for AT_LEAST/AT_MOST */
  matchTypeCount: Ref<number>
  /** Get display string for current match type */
  getMatchTypeDisplay: () => string
  /** Handle menu open - sync temp values from group */
  onMenuOpen: (isOpen: boolean) => void
  /** Confirm match type selection and apply to group */
  confirmMatchType: () => void
}

/**
 * Composable for match type selection dialog
 */
export function useMatchType(options: UseMatchTypeOptions): UseMatchTypeReturn {
  const { group, onUpdate } = options
  const { t } = useI18n()

  // Dialog state
  const showMatchTypeDialog = ref(false)
  const matchTypeTemp = ref('ALL')
  const matchTypeCount = ref(1)

  /**
   * Get display string for current match type
   */
  function getMatchTypeDisplay(): string {
    switch (group.value.logicType) {
      case 'ALL':
        return t('options.all', 'All').value
      case 'ANY':
        return t('options.any', 'Any').value
      case 'AT_LEAST':
        return `${t('options.atLeast', 'At least').value} ${group.value.count || 1}`
      case 'AT_MOST':
        return `${t('options.atMost', 'At most').value} ${group.value.count || 1}`
      default:
        return t('options.all', 'All').value
    }
  }

  /**
   * Handle menu open - sync temp values from group
   */
  function onMenuOpen(isOpen: boolean) {
    if (isOpen) {
      matchTypeTemp.value = group.value.logicType || 'ALL'
      matchTypeCount.value = group.value.count || 1
    }
  }

  /**
   * Confirm match type selection and apply to group
   */
  function confirmMatchType() {
    group.value.logicType = matchTypeTemp.value as LogicType
    if (matchTypeTemp.value === 'AT_LEAST' || matchTypeTemp.value === 'AT_MOST') {
      group.value.count = matchTypeCount.value
    } else {
      delete group.value.count
    }
    showMatchTypeDialog.value = false
    onUpdate()
  }

  return {
    showMatchTypeDialog,
    matchTypeTemp,
    matchTypeCount,
    getMatchTypeDisplay,
    onMenuOpen,
    confirmMatchType,
  }
}
