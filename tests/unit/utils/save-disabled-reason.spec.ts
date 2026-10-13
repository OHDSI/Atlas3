/**
 * Issue #300: a disabled Save button said nothing about why it was disabled.
 * The resolver owns both the wording and the order the reasons are reported in.
 */
import { describe, it, expect } from 'vitest'
import { resolveSaveDisabledReason } from '@/utils/save-disabled-reason'
import { tr } from '../../helpers/i18n-mock'

/** Stands in for useI18n's tv: resolves the key against en.json. */
const translate = (key: string, params?: Record<string, string>) => tr(key, params)

const base = {
  entity: 'characterization',
  isNew: false,
  hasName: true,
  hasPermission: true,
  translate,
}

describe('resolveSaveDisabledReason (#300)', () => {
  it('says nothing when there is no blocker', () => {
    expect(resolveSaveDisabledReason(base)).toBe('')
  })

  it('stays silent for a clean or in-flight editor rather than stating the obvious', () => {
    // Save is legitimately disabled here, but "nothing has changed" needs no
    // explaining and would put a tooltip on every freshly opened editor.
    expect(resolveSaveDisabledReason({ ...base, isDirty: false })).toBe('')
    expect(resolveSaveDisabledReason({ ...base, isSaving: true })).toBe('')
  })

  it('explains a version preview', () => {
    const reason = resolveSaveDisabledReason({ ...base, isPreviewing: true })
    expect(reason).toBe(tr('const.disabledReason.previewingVersion'))
  })

  it('distinguishes not being allowed to create from not being allowed to edit', () => {
    const create = resolveSaveDisabledReason({ ...base, isNew: true, hasPermission: false })
    const edit = resolveSaveDisabledReason({ ...base, isNew: false, hasPermission: false })

    expect(create).toBe(tr('const.disabledReason.noCreatePermission', { entity: 'characterization' }))
    expect(edit).toBe(tr('const.disabledReason.noWriteAccess', { entity: 'characterization' }))
    expect(create).not.toBe(edit)
  })

  it('names the entity it is talking about', () => {
    const reason = resolveSaveDisabledReason({
      ...base,
      entity: 'concept set',
      isNew: false,
      hasPermission: false,
    })
    expect(reason).toContain('concept set')
  })

  it('asks for a name when one is missing', () => {
    const reason = resolveSaveDisabledReason({ ...base, hasName: false })
    expect(reason).toBe(tr('const.disabledReason.needsName', { entity: 'characterization' }))
  })

  it('reports validation errors', () => {
    const reason = resolveSaveDisabledReason({ ...base, hasValidationErrors: true })
    expect(reason).toBe(tr('const.disabledReason.hasErrors'))
  })

  // Priority matters: telling someone to fill in a name they are not allowed to
  // save anyway sends them down a dead end.
  it('reports the permission problem ahead of a missing name', () => {
    const reason = resolveSaveDisabledReason({
      ...base,
      hasName: false,
      hasPermission: false,
    })
    expect(reason).toBe(tr('const.disabledReason.noWriteAccess', { entity: 'characterization' }))
  })

  it('reports the version preview ahead of everything else', () => {
    const reason = resolveSaveDisabledReason({
      ...base,
      isPreviewing: true,
      hasPermission: false,
      hasName: false,
    })
    expect(reason).toBe(tr('const.disabledReason.previewingVersion'))
  })
})
