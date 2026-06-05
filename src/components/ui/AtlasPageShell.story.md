# AtlasPageShell

Page layout wrapper that renders content inside a full-width AtlasCard with an optional header (title, subtitle, eyebrow, actions). The header only renders when a title or one of the header slots is provided.

```vue
<AtlasPageShell title="Concepts" subtitle="Browse concept sets.">…body…</AtlasPageShell>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Static header title. Overridden by the title slot when present. |
| `subtitle` | `string` | — | Static header subtitle. Overridden by the subtitle slot when present. |
| `hero` | `boolean` | `false` | Renders the header in hero style (eyebrow + accent rule + larger light-weight title). |
| `compact` | `boolean` | `false` | Tightens the hero header (smaller title and spacing). Ignored unless hero is true. |
| `eyebrow` | `string` | — | Eyebrow text shown above the title in hero mode. Ignored when hero is false. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Page body content rendered inside the card. |
| `title` | Custom header title content (e.g. an inline-edit input); wins over the title prop. |
| `subtitle` | Custom header subtitle content; wins over the subtitle prop. |
| `actions` | Header actions rendered on the right side of the header row. |

## Guidance

**Do**
- Use one PageShell per route to give pages a consistent card + header.
- Use hero for primary entry surfaces; compact hero for everyday workspace pages.

**Don't**
- Don't nest PageShells.
- Don't rely on eyebrow/compact without hero — they are ignored.
