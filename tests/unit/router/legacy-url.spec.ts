import { describe, it, expect, vi } from 'vitest'
import { foldSearchIntoHash } from '@/router/legacy-url'

/**
 * Builds a minimal Window stand-in whose history.replaceState records the URL
 * it was asked to set, so we can assert the folded result.
 */
function makeWin(pathname: string, search: string, hash: string) {
  const replaceState = vi.fn()
  const win = {
    location: { pathname, search, hash },
    history: { state: { k: 1 }, replaceState },
  } as unknown as Window
  return { win, replaceState }
}

describe('foldSearchIntoHash', () => {
  it('is a no-op when there is no real query string', () => {
    const { win, replaceState } = makeWin('/atlas/', '', '#/cohorts')
    expect(foldSearchIntoHash(win)).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('is a no-op for a bare "?" search', () => {
    const { win, replaceState } = makeWin('/atlas/', '?', '#/cohorts')
    expect(foldSearchIntoHash(win)).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('folds a query string into an empty hash, preserving the pathname', () => {
    const { win, replaceState } = makeWin('/atlas/', '?cohortId=5', '')
    expect(foldSearchIntoHash(win)).toBe(true)
    expect(replaceState).toHaveBeenCalledWith({ k: 1 }, '', '/atlas/#/?cohortId=5')
  })

  it('merges a query string into an existing hash route', () => {
    const { win, replaceState } = makeWin('/atlas/', '?token=abc', '#/oauth/callback')
    expect(foldSearchIntoHash(win)).toBe(true)
    expect(replaceState).toHaveBeenCalledWith({ k: 1 }, '', '/atlas/#/oauth/callback?token=abc')
  })

  it('merges into a hash that already has its own query, hash params winning', () => {
    const { win, replaceState } = makeWin('/atlas/', '?token=fromSearch&extra=1', '#/route?token=fromHash')
    foldSearchIntoHash(win)
    expect(replaceState).toHaveBeenCalledWith(
      { k: 1 },
      '',
      '/atlas/#/route?token=fromHash&extra=1'
    )
  })

  it('works at the deployment root regardless of base path', () => {
    const { win, replaceState } = makeWin('/', '?route=/datasources', '')
    foldSearchIntoHash(win)
    expect(replaceState).toHaveBeenCalledWith({ k: 1 }, '', '/#/?route=%2Fdatasources')
  })
})
