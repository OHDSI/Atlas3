# AtlasSkeleton

Thin wrapper over Vuetify's `VSkeletonLoader`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasSkeleton type="card" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VSkeletonLoader props` | `see Vuetify VSkeletonLoader` | — | All VSkeletonLoader props (type, loading…) are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Content shown once loading is complete. |
