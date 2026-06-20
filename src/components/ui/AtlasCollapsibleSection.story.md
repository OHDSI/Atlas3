# AtlasCollapsibleSection

An expand/collapse panel with a clickable header that can carry a badge, a status chip and a meta line, plus `controls` and `actions` slots. The body stays mounted while collapsed (so form state survives) and the header is keyboard operable (Enter / Space).

```vue
<AtlasCollapsibleSection
  title="Generation"
  badge="1"
  :state-chip="{ label: 'Ready', tone: 'success' }"
  meta="Last run · 2h ago"
>
  <!-- body -->
</AtlasCollapsibleSection>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Header label. |
| `defaultExpanded` | `boolean` | `true` | Initial expanded state; tracked until the user toggles manually. |
| `badge` | `string \| number` | — | Small circular badge shown before the title. |
| `stateChip` | `{ label: string; tone: AtlasChipTone }` | — | Status chip rendered after the title. |
| `meta` | `string` | — | Muted metadata text after the chip. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Section body (kept mounted while collapsed). |
| `controls` | Right-aligned header controls; clicks here do not toggle the section. |
| `actions` | Right-aligned header actions; clicks here do not toggle the section. |
