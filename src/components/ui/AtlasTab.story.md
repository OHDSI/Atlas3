# AtlasTab

Thin wrapper over Vuetify's `VTab`. Represents a single tab inside an AtlasTabs container. Forwards all attributes and slots unchanged.

```vue
<AtlasTabs v-model="tab"><AtlasTab value="a">First</AtlasTab></AtlasTabs>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VTab props` | `see Vuetify VTab` | — | All VTab props (value, disabled, prepend-icon…) are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Tab label content. |
