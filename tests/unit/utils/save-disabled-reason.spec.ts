/**
 * Issue #300: a disabled Save button said nothing about why it was disabled.
 * The resolver owns both the wording and the order the reasons are reported in.
 */
import { describe, it, expect } from 'vitest'
import { resolveSaveDisabledReason } from '@/utils/save-disabled-reason'

/** Stands in for useI18n's tv: returns the fallback with params interpolated. */
const translate = (_key: string, fallback: string, params?: Record<string, string>) =>
  fallback.replace(/\{(\w+)\}/g, (_m, k: string) => params?.[k] ?? `{${k}}`)

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
    expect(reason).toContain('version')
  })

  it('distinguishes not being allowed to create from not being allowed to edit', () => {
    const create = resolveSaveDisabledReason({ ...base, isNew: true, hasPermission: false })
    const edit = resolveSaveDisabledReason({ ...base, isNew: false, hasPermission: false })

    expect(create).toContain('permission')
    expect(edit).toMatch(/own|granted|access/i)
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
    expect(reason).toMatch(/name/i)
  })

  it('reports validation errors', () => {
    const reason = resolveSaveDisabledReason({ ...base, hasValidationErrors: true })
    expect(reason).toMatch(/error/i)
  })

  // Priority matters: telling someone to fill in a name they are not allowed to
  // save anyway sends them down a dead end.
  it('reports the permission problem ahead of a missing name', () => {
    const reason = resolveSaveDisabledReason({
      ...base,
      hasName: false,
      hasPermission: false,
    })
    expect(reason).toMatch(/own|granted|access|permission/i)
    expect(reason).not.toMatch(/give it a name/i)
  })

  it('reports the version preview ahead of everything else', () => {
    const reason = resolveSaveDisabledReason({
      ...base,
      isPreviewing: true,
      hasPermission: false,
      hasName: false,
    })
    expect(reason).toContain('version')
  })
})
