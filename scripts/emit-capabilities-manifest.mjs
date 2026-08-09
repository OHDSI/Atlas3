import { writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))

export function buildManifest(capabilities) {
  return [...capabilities]
    .map(({ name, description, schema, requiresApproval }) => ({ name, description, schema, requiresApproval }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function main() {
  const { CAPABILITIES } = await import(
    pathToFileURL(join(__dirname, '../src/plugins/host/capabilities/registry.ts')).href)
  const manifest = buildManifest(CAPABILITIES)
  const out = join(__dirname, '../src/plugins/host/capabilities/capabilities.manifest.json')
  await writeFile(out, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${manifest.length} capabilities to ${out}`)
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err); process.exit(1) })
}
