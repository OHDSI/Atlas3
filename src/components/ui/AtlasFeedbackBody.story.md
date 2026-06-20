# AtlasFeedbackBody

The shared presentation layer for inline feedback — a coloured severity rail, icon, title, optional count, message and action slots. It backs `AtlasAlert`, `AtlasBanner` and the toast `AtlasNotificationHost`, so use those higher-level components in app code and reach for `AtlasFeedbackBody` directly only when composing a new feedback surface.

```vue
<AtlasFeedbackBody severity="warning" title="Validation warnings" :count="3">
  Resolve these before generating the cohort.
</AtlasFeedbackBody>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `severity` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | Semantic colour of the rail, icon and count. |
| `tone` | `'severity' \| 'neutral'` | `'severity'` | `neutral` renders a muted, brand-primary "note" style instead of a severity colour. |
| `title` | `string` | — | Bold heading line. |
| `count` | `number` | — | Pill shown beside the title (e.g. number of warnings). |
| `closable` | `boolean` | `false` | Shows a dismiss button that emits `close`. |
| `elevated` | `boolean` | `false` | Drops the border for a shadowed, floating surface (used by toasts). |
| `prependIcon` | `string` | — | Overrides the default severity icon. |
| `closeLabel` | `string` | `'Dismiss'` | `aria-label` for the close button. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `close` | — | Emitted when the dismiss button is activated. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Message body. |
| `details` | Secondary detail block below the message. |
| `actions` | Action buttons row. |
| `append` | Content pinned to the trailing edge, before the close button. |
