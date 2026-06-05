# AtlasCard

Elevated surface container with brand radius, shadow and padding presets. Renders as any tag and can be made interactive.

```vue
<AtlasCard padding="lg" interactive>Content</AtlasCard>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `tag` | `string` | `'div'` | Element to render (e.g. div, a, button). |
| `interactive` | `boolean` | `false` | Adds hover lift, pointer cursor and focus ring. |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding preset. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Card content. |
