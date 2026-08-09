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

// Find the balanced-paren argument list of a call whose name ends right
// before `openParenIndex` (which must point at the opening '('). Returns
// the argument text and the index just past the matching ')', or null if
// the parens never balance on this line (e.g. the call spans lines).
function readBalancedArgs(line, openParenIndex) {
  let depth = 1
  let j = openParenIndex + 1
  for (; j < line.length && depth > 0; j++) {
    if (line[j] === '(') depth++
    else if (line[j] === ')') depth--
  }
  if (depth !== 0) return null
  return { args: line.slice(openParenIndex + 1, j - 1), end: j }
}

// An expect() argument that cannot fail regardless of what it computes:
// the literal `true`, anything OR'd with the literal `true`, or `<x> ||
// !<x>` (in either order), which is true whenever `<x>` is defined. This
// mirrors the guard-hiding disease the if-based checks above target, just
// expressed without an `if` at all. Deliberately conservative: it only
// looks at a single-line, two-operand `||` split and literal `true`/`!`
// forms, so it won't flag `expect(a || b)` where neither side is `true`
// or the other's negation.
function tautologicalExpectArg(arg) {
  const trimmed = arg.trim()
  if (trimmed === 'true') return true
  if (/\|\|\s*true$/.test(trimmed)) return true
  const parts = trimmed.split('||')
  if (parts.length === 2) {
    const a = parts[0].trim()
    const b = parts[1].trim()
    if (a && b && (b === `!${a}` || a === `!${b}`)) return true
  }
  return false
}

const hits = []
const tautologyHits = []
for (const f of files) {
  // Split on \r?\n: some files in this repo use CRLF line endings, and a
  // stray trailing \r defeats a `.` / `$`-anchored regex (CR counts as a
  // line terminator in JS regexes), which silently hid brace-less guards
  // in those files from the single-line matcher below.
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    // Tautology scan: independent of the if-guard checks below, and not
    // mutually exclusive with them (an expect() inside a guard body can
    // also be individually tautological).
    let searchFrom = 0
    for (;;) {
      const callIdx = lines[i].indexOf('expect(', searchFrom)
      if (callIdx === -1) break
      const openParenIndex = callIdx + 'expect'.length
      const parsed = readBalancedArgs(lines[i], openParenIndex)
      if (!parsed) break
      if (tautologicalExpectArg(parsed.args)) {
        tautologyHits.push(`${f}:${i + 1}  expect(${parsed.args.trim().slice(0, 90)})`)
      }
      searchFrom = parsed.end
    }

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
if (tautologyHits.length > 0) {
  console.log(`\n${tautologyHits.length} tautological assertions (cannot fail):`)
  console.log(tautologyHits.join('\n'))
}
console.error(`\n${hits.length} conditional-assertion guards in ${files.length} spec files`)
console.error(`${tautologyHits.length} tautological assertions in ${files.length} spec files`)
process.exit(hits.length > 0 || tautologyHits.length > 0 ? 1 : 0)
