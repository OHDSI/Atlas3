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

const hits = []
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(\} else )?if \((.+)\) \{\s*$/.exec(lines[i])
    if (!m) continue
    const indent = m[1].length
    let hasExpect = false, hasElse = false
    for (let j = i + 1; j < lines.length; j++) {
      const cur = lines[j]
      if (/^\s*\}/.test(cur) && cur.length - cur.trimStart().length <= indent) {
        hasElse = /\}\s*else/.test(cur)
        break
      }
      if (cur.includes('expect(')) hasExpect = true
    }
    if (hasExpect && !hasElse) hits.push(`${f}:${i + 1}  if (${m[3].slice(0, 90)})`)
  }
}
console.log(hits.join('\n'))
console.error(`\n${hits.length} conditional-assertion guards in ${files.length} spec files`)
process.exit(hits.length > 0 ? 1 : 0)
