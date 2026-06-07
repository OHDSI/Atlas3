# AtlasChip

Compact label/tag wrapping Vuetify's `VChip` with brand tones, sizes, an optional prepend icon and a closable affordance.

```vue
<AtlasChip tone="success" prepend-icon="mdi-check">passed</AtlasChip>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | `'neutral' \| 'primary' \| 'info' \| 'success' \| 'warning' \| 'danger'` | — | Semantic color; falls back to a passed color attr. |
| `size` | `'xs' \| 'sm' \| 'md'` | `'md'` | Chip size. |
| `closable` | `boolean` | `false` | Shows a close button that emits close. |
| `disabled` | `boolean` | `false` | Disables the chip. |
| `prependIcon` | `string` | — | MDI icon shown before the label. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `click` | `MouseEvent \| KeyboardEvent` | Emitted when the chip is activated. |
| `close` | `MouseEvent \| KeyboardEvent` | Emitted when the close button is activated. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Chip label content. |
