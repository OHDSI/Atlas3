/**
 * Focus handling for the app's main content region (`#main` in App.vue).
 *
 * The router uses hash history, so an in-page `href="#main"` is read as the
 * route `/main` and lands on the not-found page. The skip link and the
 * navigation hook below move focus with script instead.
 */
import type { RouteLocationNormalized } from 'vue-router'

export const MAIN_CONTENT_ID = 'main'

export function focusMainContent(options: { preventScroll?: boolean } = {}): boolean {
  if (typeof document === 'undefined') return false
  const main = document.getElementById(MAIN_CONTENT_ID)
  if (!main) return false
  main.focus({ preventScroll: options.preventScroll ?? false })
  return document.activeElement === main
}

/**
 * Whether a navigation should move focus to the main content: only when the
 * path changes (query or hash changes such as tab switches keep focus where it
 * is), never on the initial load, and never on SSO callbacks.
 */
export function shouldFocusMainOnNavigation(
  to: Pick<RouteLocationNormalized, 'path' | 'meta'>,
  from: Pick<RouteLocationNormalized, 'path' | 'matched'>,
): boolean {
  if (from.matched.length === 0) return false
  if (to.path === from.path) return false
  if (to.meta.isOAuthCallback || to.meta.isSAMLCallback || to.meta.isOpenIDCallback) return false
  return true
}

/**
 * After a page change, focus is left on the link that was clicked (or on
 * <body> if that link was removed), so screen readers do not hear the new
 * page. Move it to the main region unless the new page already put focus
 * inside it (for example an autofocused search field) or a dialog holds it.
 */
export function moveFocusAfterNavigation(): boolean {
  if (typeof document === 'undefined') return false
  const main = document.getElementById(MAIN_CONTENT_ID)
  if (!main) return false
  const active = document.activeElement
  if (active && active !== document.body && main.contains(active)) return false
  if (active?.closest('[role="dialog"], [aria-modal="true"]')) return false
  return focusMainContent({ preventScroll: true })
}
