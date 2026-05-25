import type { PathwayGroup, PathwayEventCode } from '@/models/pathway.types'

export interface PathwayHierarchyNode {
  name: string
  /** Original numeric code (bitmask) — used for color lookups. */
  code?: number
  value: number
  itemColor?: string
  children?: PathwayHierarchyNode[]
  /** When the node's name is a combo code, splitChildren describes the
   *  per-bit slices that should render as stacked colored bands. */
  splitChildren?: PathwayHierarchyNode[]
}

const END = 'end'

export function isComboCode(code: number): boolean {
  let count = 0
  let n = code
  while (n) {
    count += n & 1
    n >>>= 1
  }
  return count > 1
}

export function decomposeCombo(code: number): number[] {
  const bits: number[] = []
  for (let i = 0; i < 32; i++) {
    const bit = 1 << i
    if (code & bit) bits.push(bit)
  }
  return bits
}

export function buildPathwayHierarchy(
  group: PathwayGroup,
  eventCodes: PathwayEventCode[],
  maxDepth: number,
  colors: (key: string) => string
): PathwayHierarchyNode {
  const codeToName = new Map<number, string>()
  for (const ec of eventCodes) codeToName.set(ec.code, ec.name)
  const root: PathwayHierarchyNode = { name: 'root', value: 0, children: [] }

  for (const p of group.pathways) {
    const steps = p.path.split('-').filter(Boolean)
    const padded = steps.length < maxDepth ? [...steps, END] : steps
    let parent = root
    for (const step of padded) {
      let node = parent.children?.find(c => c.name === step)
      if (!node) {
        node = { name: step, value: 0 }
        parent.children = parent.children || []
        parent.children.push(node)
      }
      node.value += p.personCount
      parent = node
    }
    root.value += p.personCount
  }

  decorate(root, colors, codeToName)
  return root
}

function resolveCodeName(code: number, codeToName: Map<number, string>): string {
  const direct = codeToName.get(code)
  if (direct) return direct
  if (isComboCode(code)) {
    const bits = decomposeCombo(code)
    return bits.map(b => codeToName.get(b) ?? String(b)).join(' + ')
  }
  return String(code)
}

function decorate(
  node: PathwayHierarchyNode,
  colors: (key: string) => string,
  codeToName: Map<number, string>
): void {
  if (node.name !== 'root' && node.name !== END) {
    const code = Number(node.name)
    if (!Number.isNaN(code)) {
      node.code = code
      if (isComboCode(code)) {
        const bits = decomposeCombo(code)
        node.splitChildren = bits.map(b => ({
          name: codeToName.get(b) ?? String(b),
          value: node.value,
          itemColor: colors(String(b)),
        }))
        node.itemColor = colors(String(bits[0]))
      } else {
        node.itemColor = colors(node.name)
      }
      node.name = resolveCodeName(code, codeToName)
    }
  }
  if (node.name === END) node.itemColor = 'rgba(185,184,184,0.23)'
  for (const c of node.children || []) decorate(c, colors, codeToName)
}
