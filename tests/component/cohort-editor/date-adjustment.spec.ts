/**
 * Date-adjustment behaviour, re-homed from the deleted
 * tests/component/cohort-builder/DateAdjustmentEditor.spec.ts and
 * DateAdjustmentEditor-interactions.spec.ts onto cohort-editor/input/DateAdjustment.vue.
 *
 * The old editor emitted a replacement DateAdjustment on every change; this one
 * writes into the object it was handed, so the assertions move from
 * `wrapper.emitted()` to the model the caller passed in.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DateAdjustment from '@/components/circe/input/DateAdjustment.vue'
import type { DateAdjustment as DateAdjustmentModel } from '@/models/circe-types'
import { InlineAtlasMenuStub } from '../../helpers/component-wrapper'
import { tr } from '../../helpers/i18n-mock'

const vuetify = createVuetify({ components, directives })

function mountAdjustment(modelValue: DateAdjustmentModel) {
  return mount(DateAdjustment, {
    global: { plugins: [vuetify, createPinia()], stubs: { AtlasMenu: InlineAtlasMenuStub } },
    props: { modelValue },
  })
}

function summary(wrapper: ReturnType<typeof mountAdjustment>) {
  return wrapper.find('[data-testid="attribute-date-adjustment-chip"]').text()
}

/** The chip text for an adjustment, e.g. "Start: Start +0d, End: End +60d". */
function expectedSummary(startWith: 'start' | 'end', startOffset: string, endWith: 'start' | 'end', endOffset: string) {
  const start = tr('common.start')
  const end = tr('common.end')
  const d = tr('common.daysAbbr')
  const ref = (which: 'start' | 'end') => (which === 'end' ? end : start)
  return `${start}: ${ref(startWith)} ${startOffset}${d}, ${end}: ${ref(endWith)} ${endOffset}${d}`
}

function offsetInputs(wrapper: ReturnType<typeof mountAdjustment>) {
  return wrapper.findAll('input[type="number"]')
}

function referenceSelects(wrapper: ReturnType<typeof mountAdjustment>) {
  return wrapper.findAllComponents({ name: 'AtlasSelect' })
}

describe('DateAdjustment summary', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('reads an unset adjustment as both dates unshifted', () => {
    const wrapper = mountAdjustment({})

    expect(summary(wrapper)).toBe(expectedSummary('start', '+0', 'start', '+0'))
  })

  it('names each end by the date it is anchored to', () => {
    const wrapper = mountAdjustment({ StartWith: 'END_DATE', StartOffset: 0, EndWith: 'START_DATE', EndOffset: 0 })

    expect(summary(wrapper)).toBe(expectedSummary('end', '+0', 'start', '+0'))
  })

  it.each([
    [30, 60, expectedSummary('start', '+30', 'end', '+60')],
    [-30, -60, expectedSummary('start', '-30', 'end', '-60')],
    [0, 0, expectedSummary('start', '+0', 'end', '+0')],
  ] as const)('signs the offsets %i and %i', (startOffset, endOffset, expected) => {
    const wrapper = mountAdjustment({ StartWith: 'START_DATE', StartOffset: startOffset, EndWith: 'END_DATE', EndOffset: endOffset })

    expect(summary(wrapper)).toBe(expected)
  })
})

describe('DateAdjustment editing', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('offers exactly the two CDM date references, for each end', () => {
    const wrapper = mountAdjustment({})
    const selects = referenceSelects(wrapper)

    expect(selects).toHaveLength(2)
    for (const select of selects) {
      expect(select.props('items')).toEqual([
        { label: tr('options.startDate'), value: 'START_DATE' },
        { label: tr('options.endDate'), value: 'END_DATE' },
      ])
    }
  })

  it('moves only the start anchor when the start reference changes', async () => {
    const model: DateAdjustmentModel = { StartWith: 'START_DATE', StartOffset: 0, EndWith: 'START_DATE', EndOffset: 0 }
    const wrapper = mountAdjustment(model)

    referenceSelects(wrapper)[0]!.vm.$emit('update:modelValue', 'END_DATE')
    await wrapper.vm.$nextTick()

    expect(model.StartWith).toBe('END_DATE')
    expect(model.EndWith).toBe('START_DATE')
  })

  it('moves only the end anchor when the end reference changes', async () => {
    const model: DateAdjustmentModel = { StartWith: 'START_DATE', StartOffset: 0, EndWith: 'START_DATE', EndOffset: 0 }
    const wrapper = mountAdjustment(model)

    referenceSelects(wrapper)[1]!.vm.$emit('update:modelValue', 'END_DATE')
    await wrapper.vm.$nextTick()

    expect(model.EndWith).toBe('END_DATE')
    expect(model.StartWith).toBe('START_DATE')
  })

  it('writes a typed offset into the model as a number, not a string', async () => {
    const model: DateAdjustmentModel = { StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 }
    const wrapper = mountAdjustment(model)

    await offsetInputs(wrapper)[0]!.setValue('42')

    expect(model.StartOffset).toBe(42)
    expect(model.EndOffset).toBe(0)
  })

  it('keeps a negative offset negative', async () => {
    const model: DateAdjustmentModel = { StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 }
    const wrapper = mountAdjustment(model)

    await offsetInputs(wrapper)[1]!.setValue('-7')

    expect(model.EndOffset).toBe(-7)
    expect(summary(wrapper)).toBe(expectedSummary('start', '+0', 'end', '-7'))
  })

  it('falls back to no shift rather than to null when an offset is emptied', async () => {
    const model: DateAdjustmentModel = { StartWith: 'START_DATE', StartOffset: 14, EndWith: 'END_DATE', EndOffset: 0 }
    const wrapper = mountAdjustment(model)

    await offsetInputs(wrapper)[0]!.setValue('')

    expect(model.StartOffset).toBe(0)
  })

  it('shows an absent offset as zero without writing that zero into the model', () => {
    const model: DateAdjustmentModel = {}
    const wrapper = mountAdjustment(model)

    expect((offsetInputs(wrapper)[0]!.element as HTMLInputElement).value).toBe('0')
    expect((offsetInputs(wrapper)[1]!.element as HTMLInputElement).value).toBe('0')
    expect(model.StartOffset).toBeUndefined()
    expect(model.EndOffset).toBeUndefined()
  })
})
