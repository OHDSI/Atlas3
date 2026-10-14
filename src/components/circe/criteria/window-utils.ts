import { useI18n } from '@/composables/useI18n'
import type { Offset, Window } from '@/models/circe-types'

export interface WindowPresetValue {
  startWindow: Window
  endWindow?: Window
}

export interface WindowPresetOption {
  label: string
  value: WindowPresetValue
}

export function createDefaultWindow(): Window {
  return {
    Start: createDefaultEndpoint(-1),
    End: createDefaultEndpoint(1),
    UseIndexEnd: false,
    UseEventEnd: false,
  }
}

export function cloneWindow(window: Window): Window {
  return {
    Start: cloneEndpoint(window.Start, -1),
    End: cloneEndpoint(window.End, 1),
    UseIndexEnd: window.UseIndexEnd ?? false,
    UseEventEnd: window.UseEventEnd ?? false,
  }
}

export function formatWindowExpression(window?: Window): string {
  const { t } = useI18n()

  if (!window) {
    return t('common.noWindow').value
  }

  return t('components.windowExpression.summary', {
    anchor: formatAnchor(window),
    start: formatEndpoint(window.Start),
    end: formatEndpoint(window.End),
    indexAnchor: formatIndexAnchor(window),
  }).value
}

export function getWindowPresetOptions(): WindowPresetOption[] {
  const { t } = useI18n()

  return [
    buildPreset(t('components.temporalWindowEditor.shortTermBaseline').value,
      createWindow(30, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.mediumTermBaseline').value,
      createWindow(180, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.longTermBaseline').value,
      createWindow(365, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.allTimePriorToIndex').value,
      createWindow(null, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.onIndexDate').value,
      createWindow(0, 'before', 0, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.acuteFollowUp').value,
      createWindow(0, 'after', 30, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.ninetyDayFollowUp').value,
      createWindow(0, 'after', 90, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.oneYearFollowUp').value,
      createWindow(0, 'after', 365, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.allTimeAfterIndex').value,
      createWindow(0, 'after', null, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.eventOverlapsWithIndex').value,
      createWindow(0, 'after', null, 'after',false, true),
      createWindow(null, 'before', 0, 'after',true, false)
    ),
  ]
}

function createDefaultEndpoint(coeff: number): Offset {
  return {
    Days: null,
    Coeff: coeff,
  }
}

function createWindow(
  startDays: number | null,
  startDirection: 'before' | 'after',
  endDays: number | null,
  endDirection: 'before' | 'after',
  useIndexEnd = false,
  useEventEnd = false
): Window {
  return {
    Start: {
      Days: startDays,
      Coeff: startDirection === 'after' ? 1 : -1,
    },
    End: {
      Days: endDays,
      Coeff: endDirection === 'after' ? 1 : -1,
    },
    UseIndexEnd: useIndexEnd,
    UseEventEnd: useEventEnd,
  }
}

function buildPreset(label: string, startWindow: Window, endWindow?: Window): WindowPresetOption {
  return {
    label,
    value: {
      startWindow: cloneWindow(startWindow),
      ...(endWindow ? { endWindow: cloneWindow(endWindow) } : {}),
    },
  }
}

function cloneEndpoint(endpoint: Offset | null | undefined, defaultCoeff: number): Offset {
  return {
    Days: endpoint?.Days ?? null,
    Coeff: endpoint?.Coeff ?? defaultCoeff,
  }
}

function formatEndpoint(endpoint: Offset | null | undefined): string {
  const { t } = useI18n()

  if (!endpoint) {
    return t('common.unset').value
  }

  const days = formatDayCount(endpoint.Days)
  return endpoint.Coeff === -1
    ? t('components.windowExpression.endpointBefore', { days }).value
    : t('components.windowExpression.endpointAfter', { days }).value
}

/** "30 days", "1 day", or "all days" when the endpoint is unbounded. */
export function formatDayCount(days: number | null | undefined): string {
  const { t } = useI18n()

  if (days === null || days === undefined) {
    return t('common.allDays').value
  }
  return days === 1 ? t('common.dayCountOne').value : t('common.dayCount', { count: days }).value
}

// These fill the {anchor}/{indexAnchor} slots of components.windowExpression.summary
// ("event starts between 30 days before and 0 days after index start"), so they
// are lowercase and keyed separately from the capitalised chip labels that
// Window.vue renders for the same concepts.
function formatAnchor(window: Pick<Window, 'UseIndexEnd' | 'UseEventEnd'>): string {
  const { t } = useI18n()

  return window.UseEventEnd
    ? t('components.windowExpression.eventEnds').value
    : t('components.windowExpression.eventStarts').value
}

function formatIndexAnchor(window: Pick<Window, 'UseIndexEnd' | 'UseEventEnd'>): string {
  const { t } = useI18n()

  return window.UseIndexEnd
    ? t('components.windowExpression.indexEnd').value
    : t('components.windowExpression.indexStart').value
}