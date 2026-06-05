# AtlasTabs

Thin wrapper over Vuetify's `VTabs`. Forwards all attributes and slots unchanged, but pins density to "compact" (a passed density attr is stripped and ignored). Holds AtlasTab children and the selected value via v-model.

```vue
<AtlasTabs v-model="tab"><AtlasTab value="a">First</AtlasTab></AtlasTabs>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `density` | `string` | `'compact'` | Pinned to compact on the underlying VTabs; a passed density attr is stripped and ignored. |
| `…VTabs props` | `see Vuetify VTabs` | — | All other VTabs props (v-model, grow, color…) are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | The AtlasTab items. |
