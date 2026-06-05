# AtlasRadio

Single radio option wrapping Vuetify's VRadio. Use inside an AtlasRadioGroup (or VRadioGroup) which owns the selected value.

```vue
<AtlasRadioGroup v-model="choice"><AtlasRadio value="a" label="Option A" /></AtlasRadioGroup>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number` | — | The value this option represents (required). |
| `label` | `string` | — | Option label text. |
| `disabled` | `boolean` | `false` | Disables this option. |
| `…VRadio props` | `see Vuetify VRadio` | — | Additional VRadio props are forwarded via attrs. |

## Guidance

**Do**
- Always render inside a radio group that owns the model value.
- Give every option a clear label.

**Don't**
- Don't bind v-model on individual radios — the group owns selection.
