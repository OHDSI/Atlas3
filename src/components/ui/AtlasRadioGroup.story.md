# AtlasRadioGroup

Container for AtlasRadio options wrapping Vuetify's VRadioGroup. Owns the selected value via v-model and handles label, required marker, error and layout.

```vue
<AtlasRadioGroup v-model="choice" label="Method" required><AtlasRadio value="a" label="Email" /></AtlasRadioGroup>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string \| number` | — | Selected value (use v-model). |
| `label` | `string` | — | Group label; a * is appended when required. |
| `inline` | `boolean` | `false` | Lays radios out horizontally instead of stacked. |
| `error` | `string` | — | Error message shown below the group; sets aria-invalid. |
| `disabled` | `boolean` | `false` | Disables all options. |
| `required` | `boolean` | `false` | Marks the group required (appends * and sets aria-required). |
| `…VRadioGroup props` | `see Vuetify VRadioGroup` | — | Additional VRadioGroup props are forwarded via attrs (density is fixed to compact). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `string \| number \| null` | Emitted when the selection changes. |

## Slots

| Name | Description |
|------|-------------|
| `default` | AtlasRadio options. |

## Guidance

**Do**
- Provide a clear group label.
- Use inline only for short option sets.

**Don't**
- Don't put v-model on the child radios.
