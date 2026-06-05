# AtlasFab

Circular floating action button wrapping Vuetify's `VBtn` in icon mode, fixed at 56px with elevation for a primary page action.

```vue
<AtlasFab icon="mdi-plus" aria-label="Add concept set" @click="create" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `string` | — | MDI icon name shown in the button (required). |
| `ariaLabel` | `string` | — | Accessible label and title; the button has no visible text (required). |
| `color` | `string` | `'primary'` | Button color. |
| `disabled` | `boolean` | `false` | Disables the button. |
| `…VBtn props` | `see Vuetify VBtn` | — | Additional VBtn props are forwarded via attrs (size and elevation are fixed). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `click` | `MouseEvent` | Emitted when the button is activated. |

## Guidance

**Do**
- Always provide an aria-label since the button has no text.
- Use one FAB per view for the primary action.

**Don't**
- Don't use a FAB for secondary or destructive actions.
