# AtlasSideSheet

Full-height panel that slides in from the right, built on Vuetify's `VDialog` so it joins the global overlay stack. Menus, selects, tooltips, dialogs, and nested side sheets opened from inside it stack above it automatically — never set a z-index on overlays inside a side sheet.

Escape and scrim clicks close only the top-most overlay, body scroll is locked while open, focus is kept inside the sheet, and focus returns to the previously focused element on close. Browser back navigation does not close the sheet.

```vue
<AtlasSideSheet v-model="open" aria-label="Edit concept set">...</AtlasSideSheet>
```

To guard a close (e.g. unsaved changes), bind `:model-value` and handle `update:modelValue(false)` yourself — the sheet stays open until the parent sets it to `false`.

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `(required)` | Open state. Use v-model. |
| `width` | `number \| string` | `'max(500px, 95vw)'` | Panel width; always capped at the viewport width. |
| `persistent` | `boolean` | `false` | Prevents closing via scrim click or escape. |
| `scrim` | `boolean` | `true` | Shows the backdrop behind the sheet. |
| `ariaLabel` | `string` | — | Accessible name for the dialog. |
| `contentClass` | `string` | — | Extra class applied to the panel element. |

Other attributes (`data-testid`, `class`, ...) are forwarded to the underlying `VDialog`.

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when the sheet requests to open or close. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Panel content. Give the root `height: 100%` and manage scrolling inside it. |
