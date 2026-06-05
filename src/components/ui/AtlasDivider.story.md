# AtlasDivider

Thin wrapper over Vuetify's `VDivider`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasDivider />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VDivider props` | `see Vuetify VDivider` | — | All VDivider props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Optional inline content rendered within the divider. |
