# AtlasBanner

Thin wrapper over Vuetify's `VBanner`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasBanner text="A banner message" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VBanner props` | `see Vuetify VBanner` | — | All VBanner props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Banner body content. |
| `prepend` | Leading content such as an icon or avatar. |
| `actions` | Trailing action buttons. |
