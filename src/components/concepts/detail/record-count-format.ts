import { formatNumber } from '@/utils/format'

export function formatRecordCount(value: number | undefined): string {
  return value === undefined ? '—' : formatNumber(value)
}
