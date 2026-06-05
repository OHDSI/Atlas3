# AtlasSnackbar

Transient notification wrapping Vuetify's VSnackbar. Maps a semantic severity to a color and ARIA role, with an optional built-in close button.

```vue
<AtlasSnackbar v-model="open" severity="success" text="Saved." />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | — | Open state (use v-model) (required). |
| `severity` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | Semantic tone; sets color and aria-live (danger is assertive). |
| `text` | `string` | — | Message text (used when the default slot is empty). |
| `timeout` | `number` | `5000` | Auto-dismiss delay in ms; use -1 to disable. |
| `location` | `'top' \| 'bottom'` | `'bottom'` | Where the snackbar appears. |
| `closable` | `boolean` | `true` | Shows a built-in Close button (unless the actions slot is used). |
| `…VSnackbar props` | `see Vuetify VSnackbar` | — | Additional VSnackbar props are forwarded via attrs (color is derived from severity). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when the open state changes (e.g. on timeout or close). |

## Slots

| Name | Description |
|------|-------------|
| `default` | Message content; overrides the text prop. |
| `actions` | Custom action buttons; replaces the built-in Close button. |

## Guidance

**Do**
- Use severity to convey meaning rather than custom colors.
- Keep messages short.

**Don't**
- Don't use a long timeout for non-critical messages.
