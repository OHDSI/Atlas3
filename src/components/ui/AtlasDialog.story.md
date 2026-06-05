# AtlasDialog

Modal dialog wrapping Vuetify's `VDialog` with a branded card (eyebrow, title, subtitle, close button), focus restoration, or a chromeless passthrough.

```vue
<AtlasDialog v-model="open" eyebrow="CONFIRM" title="Discard changes?">...<template #actions>...</template></AtlasDialog>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `(required)` | Open state. Use v-model. |
| `eyebrow` | `string` | `''` | Small uppercase label above the title. |
| `title` | `string` | — | Dialog heading (also drives aria-labelledby). |
| `subtitle` | `string` | — | Secondary line below the title. |
| `maxWidth` | `number \| string` | `560` | Maximum dialog width. |
| `width` | `number \| string` | — | Explicit dialog width. |
| `persistent` | `boolean` | `false` | Prevents closing via overlay click or escape. |
| `showClose` | `boolean` | `true` | Shows the header close button. |
| `closeLabel` | `string` | `'Close dialog'` | Accessible label for the close button. |
| `chromeless` | `boolean` | `false` | Renders the default slot without the branded card chrome. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when the open state changes. |
| `close` | — | Emitted when the dialog closes. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Dialog body content. |
| `actions` | Footer actions (typically buttons). |
