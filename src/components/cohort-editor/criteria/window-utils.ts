import { useI18n } from '@/composables/useI18n'
import type { Offset, Window } from '../circe.types'

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
    return t('common.noWindow', 'No window').value
  }

  return `${formatAnchor(window)} ${t('common.between', 'between').value} ${formatEndpoint(window.Start)} ${t('common.and', 'and').value} ${formatEndpoint(window.End)} ${formatIndexAnchor(window)}`
}

export function getWindowPresetOptions(): WindowPresetOption[] {
  const { t } = useI18n()

  return [
    buildPreset(t('components.temporalWindowEditor.shortTermBaseline', 'Short-term baseline (−30 to 0 days)').value,
      createWindow(30, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.mediumTermBaseline', 'Medium-term baseline (−180 to 0 days)').value,
      createWindow(180, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.longTermBaseline', 'Long-term baseline (−365 to 0 days)').value,
      createWindow(365, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.allTimePriorToIndex', 'All time prior to index').value,
      createWindow(null, 'before', 0, 'after'),
      undefined
    ),
    buildPreset(t('components.temporalWindowEditor.onIndexDate', 'On index date').value,
      createWindow(0, 'before', 0, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.acuteFollowUp', 'Acute follow-up (0 to 30 days after)').value,
      createWindow(0, 'after', 30, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.ninetyDayFollowUp', '90-day follow-up (0 to 90 days after)').value,
      createWindow(0, 'after', 90, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.oneYearFollowUp', '1-year follow-up (0 to 365 days after)').value,
      createWindow(0, 'after', 365, 'after')
    ),
    buildPreset(t('components.temporalWindowEditor.allTimeAfterIndex', 'All time after index').value,
      createWindow(0, 'after', null, 'after')
    ),buildPreset(t('components.temporalWindowEditor.eventOverlapsWithIndex', 'event overlapps with index').value,
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
    return t('common.unset', 'unset').value
  }

  const direction = endpoint.Coeff === -1 ? t('options.before', 'before').value : t('options.after', 'after').value
  const days = endpoint.Days === null || endpoint.Days === undefined ? t('common.allDays', 'all days').value : `${endpoint.Days} ${endpoint.Days === 1 ? t('common.day', 'day').value : t('common.days', 'days').value}`

  return `${days} ${direction}`
}

function formatAnchor(window: Pick<Window, 'UseIndexEnd' | 'UseEventEnd'>): string {
  const { t } = useI18n()

  return window.UseEventEnd ? t('common.eventEnds', 'event ends').value : t('common.eventStarts', 'event starts').value
}

function formatIndexAnchor(window: Pick<Window, 'UseIndexEnd' | 'UseEventEnd'>): string {
  const { t } = useI18n()

  if (window.UseIndexEnd && window.UseEventEnd) {
    return t('common.indexEnds', 'index end').value
  }

  if (window.UseIndexEnd) {
    return t('common.indexEnds', 'index end').value
  }

  return t('common.indexStarts', 'index start').value
}