import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const SRC_DIR = path.resolve(__dirname, '../../../src')

function listVueFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.vue'))
    .map((entry) => path.join(dir, entry))
}

function scopedStyleBlocks(source: string): string[] {
  const blocks: string[] = []
  const styleTagRe = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let match: RegExpExecArray | null
  while ((match = styleTagRe.exec(source)) !== null) {
    const [, attrs, body] = match
    if (/\bscoped\b/.test(attrs)) blocks.push(body)
  }
  return blocks
}

// `:global(.v-theme--dark) .foo` silently compiles to a bare `.v-theme--dark`
// rule under Vue 3 scoped CSS — everything after the :global() wrapper is
// dropped, and because the rule still matches the theme root and most
// properties inherit, it leaks an arbitrary colour onto unrelated
// descendants instead of doing nothing. This bug shipped across 31 files in
// the dark-mode sweep and read as correct in every review because the
// source itself looks right; only a compiled-output or rendered-page check
// catches it. The fix is to drop the `:global()` wrapper — ancestor
// selectors in Vue 3 scoped CSS (e.g. `.v-theme--dark .foo { ... }`) are
// already left unscoped, so `:global()` is never needed here.
//
// The same miscompilation happens for ANY ancestor wrapped in :global(),
// not just .v-theme--dark (e.g. `:global(.some-other-class) .target`), so
// the check below matches a :global(...) wrapper followed by a further
// compound selector, rather than hard-coding the .v-theme--dark class name.
describe('scoped dark-mode selectors', () => {
  it('never wraps an ancestor in :global() followed by a further selector inside a scoped <style> block', () => {
    const offenders: string[] = []
    for (const file of listVueFiles(SRC_DIR)) {
      const source = readFileSync(file, 'utf-8')
      for (const block of scopedStyleBlocks(source)) {
        if (/:global\([^)]*\)\s*\S/.test(block)) {
          offenders.push(path.relative(SRC_DIR, file))
        }
      }
    }

    expect(
      offenders,
      offenders.length
        ? `Found ":global(...) <selector>" inside <style scoped> in:\n${offenders.join('\n')}\n\n` +
            'This pattern silently compiles to a bare ":global(...) { ... }" rule ' +
            '(everything after :global() is dropped), which leaks its declarations onto ' +
            'the wrapped ancestor instead of the intended descendant. Use a plain ' +
            '".ancestor .your-selector { ... }" descendant selector instead — no :global() ' +
            'wrapper needed, since ancestor selectors in Vue 3 scoped CSS are already left unscoped.'
        : undefined,
    ).toEqual([])
  })
})
