import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  focusMainContent,
  moveFocusAfterNavigation,
  shouldFocusMainOnNavigation,
} from '@/utils/mainContentFocus'

function route(path: string, meta: Record<string, unknown> = {}, matched = 1) {
  return { path, meta, matched: Array.from({ length: matched }, () => ({})) } as never
}

describe('mainContentFocus', () => {
  let main: HTMLElement
  let nav: HTMLAnchorElement

  beforeEach(() => {
    document.body.innerHTML = `
      <nav><a id="nav-link" href="#/cohorts">Cohorts</a></nav>
      <main id="main" tabindex="-1"><input id="search" /></main>
      <div role="dialog"><button id="dialog-btn">OK</button></div>
    `
    main = document.getElementById('main')!
    nav = document.getElementById('nav-link') as HTMLAnchorElement
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('focusMainContent', () => {
    it('focuses #main without changing the hash', () => {
      const hashBefore = window.location.hash
      expect(focusMainContent()).toBe(true)
      expect(document.activeElement).toBe(main)
      expect(window.location.hash).toBe(hashBefore)
    })

    it('returns false when there is no #main', () => {
      main.remove()
      expect(focusMainContent()).toBe(false)
    })
  })

  describe('shouldFocusMainOnNavigation', () => {
    it('is true when the path changes', () => {
      expect(shouldFocusMainOnNavigation(route('/cohorts'), route('/concepts'))).toBe(true)
    })

    it('is false on the initial navigation', () => {
      expect(shouldFocusMainOnNavigation(route('/cohorts'), route('/', {}, 0))).toBe(false)
    })

    it('is false when only the query or hash changes', () => {
      expect(shouldFocusMainOnNavigation(route('/cohorts'), route('/cohorts'))).toBe(false)
    })

    it.each(['isOAuthCallback', 'isSAMLCallback', 'isOpenIDCallback'])(
      'is false for %s routes',
      flag => {
        expect(shouldFocusMainOnNavigation(route('/cb', { [flag]: true }), route('/cohorts'))).toBe(false)
      },
    )
  })

  describe('moveFocusAfterNavigation', () => {
    it('moves focus from the clicked nav link to #main', () => {
      nav.focus()
      expect(moveFocusAfterNavigation()).toBe(true)
      expect(document.activeElement).toBe(main)
    })

    it('moves focus to #main when focus fell back to <body>', () => {
      expect(document.activeElement).toBe(document.body)
      expect(moveFocusAfterNavigation()).toBe(true)
      expect(document.activeElement).toBe(main)
    })

    it('keeps focus that the new page placed inside #main', () => {
      const search = document.getElementById('search')!
      search.focus()
      expect(moveFocusAfterNavigation()).toBe(false)
      expect(document.activeElement).toBe(search)
    })

    it('keeps focus inside an open dialog', () => {
      const btn = document.getElementById('dialog-btn')!
      btn.focus()
      expect(moveFocusAfterNavigation()).toBe(false)
      expect(document.activeElement).toBe(btn)
    })
  })
})
