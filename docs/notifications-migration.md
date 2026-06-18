# Notifications migration guide

Transient feedback now goes through the global store instead of a per-view
`AtlasSnackbar`. Page-level banners that are *content* (e.g.
ConfigurationWarningBanner, empty states, inline form validation) stay as
`AtlasAlert` rendered in place — do not move those.

## Pattern

Before (per view):
- a `const feedback = ref<{ message; color } | null>(null)` + `feedbackSeverity` computed
- an `<AtlasSnackbar :model-value="!!feedback" … />` in the template

After:
```ts
import { useNotifications } from '@/stores/notifications'
const notify = useNotifications()
notify.success('Saved')
notify.danger('Failed', { message: 'details', actions: [{ label: 'Retry', handler: retry }] })
```
Remove the local ref and the `<AtlasSnackbar>` markup. The global
`AtlasNotificationHost` (mounted in App.vue) renders the toast.

## Severity mapping
`color: 'success' → notify.success`, `'error' → notify.danger`,
`'info' → notify.info`, warnings → `notify.warning`.

## Remaining call sites
Find them with: `rg -l 'AtlasSnackbar' src`. Migrate one view per PR; each is
independently verifiable. IncidenceRatesView.vue is the worked reference.

## Cleaning up AtlasAlert props during migration

When migrating a view that contains inline `<AtlasAlert>` banners, strip any
props that no longer exist in the new component:

- `variant` — Direction C is the only style; the prop is ignored and should be removed.
- `density` — no longer forwarded; remove it.
- `prominent` — removed in the redesign; remove it.

Also remove any `#prepend` slot that simply renders the severity icon, e.g.:
```html
<template #prepend><AtlasIcon>mdi-alert</AtlasIcon></template>
```
The new `AtlasFeedbackBody` rail already renders the correct severity icon
automatically. Leaving these props/slots in place is harmless, but they should
be stripped as part of each view's migration to keep templates clean.
