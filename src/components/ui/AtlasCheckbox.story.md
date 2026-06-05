# AtlasCheckbox

Boolean checkbox wrapping Vuetify's `VCheckbox` with brand label/required/error conventions and an indeterminate state.

```vue
<AtlasCheckbox v-model="agreed" label="I agree" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | Checked state. Use v-model. |
| `label` | `string` | — | Checkbox label. |
| `disabled` | `boolean` | `false` | Disables the checkbox. |
| `error` | `string` | — | Error message; sets aria-invalid. |
| `indeterminate` | `boolean` | `false` | Shows the mixed/indeterminate state. |
| `required` | `boolean` | `false` | Sets aria-required. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when toggled (coerced to boolean). |
