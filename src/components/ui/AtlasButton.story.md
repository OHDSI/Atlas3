# AtlasButton

Brand-styled action button wrapping Vuetify's `VBtn` with semantic variants, sizes, tones, loading and icon support.

```vue
<AtlasButton variant="primary" icon="mdi-plus">Add</AtlasButton>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'tonal' \| 'danger' \| 'ghost' \| 'link'` | `'primary'` | Visual style. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Button size. |
| `tone` | `'primary' \| 'neutral' \| 'warning' \| 'danger' \| 'success' \| 'info'` | — | Overrides color independent of variant. |
| `loading` | `boolean` | `false` | Shows a spinner and disables interaction. |
| `disabled` | `boolean` | `false` | Disables the button. |
| `icon` | `string` | — | MDI icon name. |
| `iconPosition` | `'start' \| 'end'` | `'start'` | Icon side. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Native button type. |
| `toggle` | `boolean` | `false` | Acts as a toggle button (color/variant defer to a parent button group). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `click` | `MouseEvent` | Emitted when the button is activated. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Button label content. |

## Guidance

**Do**
- Use one primary button per view for the main action.
- Use `danger` only for destructive actions.

**Don't**
- Use the `link` variant for primary actions.
- Pack more than ~3 buttons in a row.
