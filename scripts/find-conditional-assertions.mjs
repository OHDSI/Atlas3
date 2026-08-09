import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] || 'tests'
const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(spec|test)\.ts$/.test(e.name)) files.push(p)
  }
})(root)

// A single-line if-body is not itself a guard worth flagging when it is a
// control-flow statement (return/continue/break/throw) rather than an
// assertion, even if the line happens to contain the substring "expect(".
const NON_ASSERTION_BODY = /^(return|continue|break|throw)\b/

const hits = []
for (const f of files) {
  // Split on \r?\n: some files in this repo use CRLF line endings, and a
  // stray trailing \r defeats a `.` / `$`-anchored regex (CR counts as a
  // line terminator in JS regexes), which silently hid brace-less guards
  // in those files from the single-line matcher below.
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const braceMatch = /^(\s*)(\} else )?if \((.+)\) \{\s*$/.exec(lines[i])
    if (braceMatch) {
      const indent = braceMatch[1].length
      let hasExpect = false, hasElse = false
      for (let j = i + 1; j < lines.length; j++) {
        const cur = lines[j]
        if (/^\s*\}/.test(cur) && cur.length - cur.trimStart().length <= indent) {
          hasElse = /\}\s*else/.test(cur)
          break
        }
        if (cur.includes('expect(')) hasExpect = true
      }
      if (hasExpect && !hasElse) hits.push(`${f}:${i + 1}  if (${braceMatch[3].slice(0, 90)})`)
      continue
    }

    // Brace-less single-line form: `if (cond) expect(...)`. Finding the end
    // of `cond` cannot be done with a single greedy or non-greedy `.+`: a
    // greedy `(.+)\) ` backtracks to the rightmost `") "` on the line,
    // which on `if (cond) it('...', () => { expect(foo).toBe(bar) })`
    // swallows the whole `it(...)` call into the condition group and the
    // `expect(` check never sees a body to inspect. A non-greedy `(.+?)\) `
    // fails just as badly the other way on conditions with their own
    // nested parens, e.g. `if (await x.count() > 0) ...` stops at the `)`
    // inside `count()`. Neither can tell a condition's closing paren from
    // any other paren without tracking depth, so scan for it directly.
    const linePrefix = /^(\s*)(\} else )?if \(/.exec(lines[i])
    if (!linePrefix) continue
    const line = lines[i]
    let depth = 1
    let j = linePrefix[0].length
    for (; j < line.length && depth > 0; j++) {
      if (line[j] === '(') depth++
      else if (line[j] === ')') depth--
    }
    if (depth !== 0) continue // unbalanced on this line (e.g. multi-line condition); skip
    const cond = line.slice(linePrefix[0].length, j - 1)
    const body = line.slice(j).replace(/^\s+/, '')
    if (body.length === 0) continue
    if (body.startsWith('{')) continue
    if (/\belse\b/.test(body)) continue
    if (NON_ASSERTION_BODY.test(body.trim())) continue
    if (!body.includes('expect(')) continue
    hits.push(`${f}:${i + 1}  if (${cond.slice(0, 90)})`)
  }
}
console.log(hits.join('\n'))
console.error(`\n${hits.length} conditional-assertion guards in ${files.length} spec files`)
process.exit(hits.length > 0 ? 1 : 0)
