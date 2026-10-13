// Obsidian-style ==highlight== -> <mark>highlight</mark>.
// Works across formatting (==**bold** text==, ==`code`==) because it pairs the == markers
// between sibling nodes. Inline code and code blocks are separate nodes, so `a == b` in code
// is never touched. Like Obsidian, == must hug the text: "== x ==" is left as plain text.

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: Record<string, unknown> }

export default function remarkHighlight() {
  return (tree: MdNode) => walk(tree)
}

function walk(node: MdNode) {
  if (!node.children) return
  node.children.forEach(walk)
  if (node.children.some((c) => c.type === 'text' && c.value!.includes('=='))) {
    node.children = highlight(node.children)
  }
}

const isBoundary = (ch: string) => ch === '' || ch === '=' || /\s/.test(ch)

function highlight(children: MdNode[]): MdNode[] {
  const out: MdNode[] = []
  let mark: MdNode | null = null
  const add = (n: MdNode) => (mark ? mark.children! : out).push(n)

  children.forEach((child, ci) => {
    if (child.type !== 'text' || !child.value!.includes('==')) return add(child)

    const parts = child.value!.split('==')
    parts.forEach((part, i) => {
      if (i > 0) {
        if (mark) {
          const inside = mark.children!
          const last = inside[inside.length - 1]
          const before = !last ? '' : last.type === 'text' ? last.value!.slice(-1) : 'x'
          if (!isBoundary(before)) {
            out.push(mark)
            mark = null
          } else {
            add({ type: 'text', value: '==' })
          }
        } else {
          // character right after this ==; a following sibling node (e.g. **bold**) counts as text
          const after = part ? part[0] : i === parts.length - 1 && ci < children.length - 1 ? 'x' : ''
          if (!isBoundary(after)) {
            mark = { type: 'mark', data: { hName: 'mark' }, children: [] }
          } else {
            add({ type: 'text', value: '==' })
          }
        }
      }
      if (part) add({ type: 'text', value: part })
    })
  })

  // an opening == that never closed is just text
  if (mark) out.push({ type: 'text', value: '==' }, ...(mark as MdNode).children!)
  return out
}
