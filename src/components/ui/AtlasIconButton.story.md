# AtlasIconButton

Icon-only button wrapping Vuetify's `VBtn` with brand variants, sizes and tones. Requires an accessible label.

```vue
<AtlasIconButton icon="mdi-close" aria-label="Close" tone="danger" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `string` | `(required)` | MDI icon name. |
| `ariaLabel` | `string` | `(required)` | Accessible label describing the action. |
| `variant` | `'tonal' \| 'text' \| 'flat'` | `'tonal'` | Visual style. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size. |
| `tone` | `'primary' \| 'neutral' \| 'danger'` | `'neutral'` | Semantic color. |
| `loading` | `boolean` | `false` | Shows a spinner and disables interaction. |
| `disabled` | `boolean` | `false` | Disables the button. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `click` | `MouseEvent` | Emitted when the button is activated. |

## Guidance

**Do**
- Always provide a descriptive aria-label.
