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
