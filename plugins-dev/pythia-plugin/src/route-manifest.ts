// Loaded from Atlas3's generated manifest. Single source of truth for
// route names, param keys, and labels exposed to Pythia. Regenerate
// with `npm run generate:routes` in the Atlas3 root.
import manifestJson from '../../../src/router/routes.manifest.json'

export interface RouteManifestEntry {
  name: string
  path: string
  params: string[]
  agentVisible: boolean
  label?: string
}

const manifest = manifestJson as RouteManifestEntry[]
const byName = new Map(manifest.map(r => [r.name, r]))

export function agentVisibleViews(): string[] {
  return manifest.filter(r => r.agentVisible).map(r => r.name)
}

export function isAgentVisibleView(name: string): boolean {
  return byName.get(name)?.agentVisible === true
}

export function getViewParams(name: string): string[] {
  return byName.get(name)?.params ?? []
}

export function getViewLabel(name: string): string {
  const r = byName.get(name)
  return r?.label ?? name
}

export function fullManifest(): RouteManifestEntry[] {
  return manifest
}
