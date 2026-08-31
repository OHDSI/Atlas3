/**
 * Why a Save button is disabled, in words the user can act on.
 *
 * A disabled Save with no explanation reads as a broken feature rather than a
 * permission boundary, and the user cannot tell whether to ask for access or
 * fix something themselves (#300). Every module resolves its reason here so the
 * same situation is described the same way wherever it comes up.
 */
export interface SaveGate {
  /** The noun for this module, already translated: "cohort", "concept set". */
  entity: string
  /** An unsaved asset is gated on create permission, a saved one on write access. */
  isNew: boolean
  hasName: boolean
  hasPermission: boolean
  isPreviewing?: boolean
  hasValidationErrors?: boolean
  /** Present only where the module gates Save on having changes at all. */
  isDirty?: boolean
  isSaving?: boolean
  translate: (key: string, fallback: string, params?: Record<string, string>) => string
}

/**
 * The first blocker worth reporting, or an empty string to show no tooltip.
 *
 * Order is deliberate. A user who cannot save at all should hear that before
 * being sent to fill in a name, and someone reading a historical version needs
 * to know that first of all, since every other gate is downstream of it.
 */
export function resolveSaveDisabledReason(gate: SaveGate): string {
  const { translate: t, entity } = gate

  if (gate.isPreviewing) {
    return t(
      'const.disabledReason.previewingVersion',
      'You are previewing an earlier version. Return to the current version to save.'
    )
  }

  if (!gate.hasPermission) {
    return gate.isNew
      ? t('const.disabledReason.noCreatePermission', 'You do not have permission to create a {entity}.', {
          entity,
        })
      : t(
          'const.disabledReason.noWriteAccess',
          'You do not own this {entity} and have not been granted write access to it.',
          { entity }
        )
  }

  if (!gate.hasName) {
    return t('const.disabledReason.needsName', 'Give the {entity} a name before saving.', { entity })
  }

  if (gate.hasValidationErrors) {
    return t('const.disabledReason.hasErrors', 'Resolve the validation errors before saving.')
  }

  // Everything below here is either self-evident or momentary: nothing has
  // changed yet, or a save is already running. Explaining those would put a
  // tooltip on the most common state of every editor and teach the user to
  // ignore it.
  return ''
}
