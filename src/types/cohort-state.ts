/**
 * Cohort Builder State Types
 *
 * Grouped reactive state interfaces for CohortBuilder component.
 * These replace 32 individual refs with 3 logical groupings.
 */

/**
 * Validation error for a cohort field.
 */
export interface ValidationError {
  /** The field that has the error */
  field: string
  /** Human-readable error message */
  message: string
  /** Optional severity level */
  severity?: 'error' | 'warning'
}

/**
 * UI-related state for dialog visibility and user interactions.
 */
export interface CohortUIState {
  /** Whether the search dialog is open */
  isSearchDialogOpen: boolean
  /** Whether the export dialog is open */
  isExportDialogOpen: boolean
  /** Whether the import dialog is open */
  isImportDialogOpen: boolean
  /** Currently active panel identifier */
  activePanel: string | null
  /** Currently selected event ID */
  selectedEventId: string | null
  /** Set of expanded group IDs */
  expandedGroups: Set<string>
}

/**
 * Loading and error state for async operations.
 */
export interface CohortLoadingState {
  /** Whether cohort is currently loading */
  isLoading: boolean
  /** Whether cohort is currently saving */
  isSaving: boolean
  /** Error message from last load attempt */
  loadError: string | null
  /** Error message from last save attempt */
  saveError: string | null
}

/**
 * Cohort data and validation state.
 */
export interface CohortDataState {
  /** Whether cohort has unsaved changes */
  isDirty: boolean
  /** Current validation errors */
  validationErrors: ValidationError[]
  /** When the cohort was last saved */
  lastSaved: Date | null
}

/**
 * Factory function to create default UI state.
 */
export function createDefaultUIState(): CohortUIState {
  return {
    isSearchDialogOpen: false,
    isExportDialogOpen: false,
    isImportDialogOpen: false,
    activePanel: null,
    selectedEventId: null,
    expandedGroups: new Set<string>(),
  }
}

/**
 * Factory function to create default loading state.
 */
export function createDefaultLoadingState(): CohortLoadingState {
  return {
    isLoading: false,
    isSaving: false,
    loadError: null,
    saveError: null,
  }
}

/**
 * Factory function to create default data state.
 */
export function createDefaultDataState(): CohortDataState {
  return {
    isDirty: false,
    validationErrors: [],
    lastSaved: null,
  }
}
