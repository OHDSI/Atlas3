# AtlasAlert

Inline notification banner wrapping Vuetify's `VAlert` with brand severities, a default per-severity icon and optional dismiss.

```vue
<AtlasAlert severity="success" title="Saved">Cohort saved.</AtlasAlert>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `severity` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | Semantic tone; maps to the VAlert type and default icon. |
| `title` | `string` | — | Bold heading shown above the body. |
| `closable` | `boolean` | `false` | Shows a close button that emits close. |
| `variant` | `'tonal' \| 'outlined' \| 'flat'` | `'tonal'` | Visual style. |
| `prependIcon` | `string` | — | MDI icon overriding the severity default. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `close` | — | Emitted when the close button is clicked. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Alert body content. |
| `prepend` | Custom leading content (replaces the icon area). |
| `append` | Custom trailing content. |
