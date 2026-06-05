# AtlasSpacer

Thin wrapper over Vuetify's `VSpacer`. Forwards all attributes unchanged; renders a flex spacer that pushes sibling content apart inside a flex container.

```vue
<div style="display:flex"><span>Left</span><AtlasSpacer /><span>Right</span></div>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VSpacer props` | `see Vuetify VSpacer` | — | All VSpacer props are forwarded via attrs. |
