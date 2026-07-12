/**
 * CohortJsonDialog Component Tests
 *
 * The dialog holds a *draft* of the cohort's Atlas JSON: nothing it does
 * touches the builder until "Apply to builder" is pressed, which emits the
 * draft text upward.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortJsonDialog from '@/components/cohort/CohortJsonDialog.vue'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    tv: (key: string, fallback?: string, params?: Record<string, unknown>) => {
      const template = fallback || key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (match, name) =>
        params[name] !== undefined ? String(params[name]) : match
      )
    },
  }),
}))

const vuetify = createVuetify({ components, directives })

const VALID_JSON = JSON.stringify({ PrimaryCriteria: { CriteriaList: [] } }, null, 2)

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(CohortJsonDialog, {
    props: {
      modelValue: true,
      json: VALID_JSON,
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        // AtlasDialog teleports to body via v-dialog; render its slots
        // inline so the test can drive the editor and the action buttons.
        AtlasDialog: {
          props: ['modelValue'],
          template:
            '<div v-if="modelValue"><slot /><slot name="actions" /></div>',
        },
      },
    },
  })
}

describe('CohortJsonDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Seeding the draft', () => {
    it('fills the editor with the cohort JSON when opened', () => {
      const wrapper = mountComponent()

      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(VALID_JSON)
    })

    it('re-seeds from the source JSON on each open, discarding abandoned edits', async () => {
      const wrapper = mountComponent({ modelValue: false })

      await wrapper.setProps({ modelValue: true })
      await wrapper.find('textarea').setValue('{"edited": true}')
      // Close without applying, then reopen with a fresh expression.
      await wrapper.setProps({ modelValue: false })
      await wrapper.setProps({ modelValue: true, json: '{"fresh": 1}' })

      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('{"fresh": 1}')
    })
  })

  describe('Applying', () => {
    it('emits apply with the edited JSON', async () => {
      const wrapper = mountComponent()
      const edited = '{"PrimaryCriteria": {"CriteriaList": [{"ConditionOccurrence": {}}]}}'

      await wrapper.find('textarea').setValue(edited)
      await wrapper.find('[data-testid="cohort-json-apply"]').trigger('click')

      expect(wrapper.emitted('apply')).toBeTruthy()
      expect(wrapper.emitted('apply')![0]).toEqual([edited])
    })

    it('does not emit apply when the JSON is malformed', async () => {
      const wrapper = mountComponent()

      await wrapper.find('textarea').setValue('{ "PrimaryCriteria": ')
      await wrapper.find('[data-testid="cohort-json-apply"]').trigger('click')

      expect(wrapper.emitted('apply')).toBeFalsy()
    })

    it('disables apply while previewing an old version', async () => {
      const wrapper = mountComponent({ canApply: false })

      const applyBtn = wrapper.findComponent('[data-testid="cohort-json-apply"]')
      expect(applyBtn.props('disabled')).toBe(true)

      await wrapper.find('[data-testid="cohort-json-apply"]').trigger('click')
      expect(wrapper.emitted('apply')).toBeFalsy()
    })

    it('disables apply when the editor is empty', async () => {
      const wrapper = mountComponent()

      await wrapper.find('textarea').setValue('   ')

      expect(wrapper.findComponent('[data-testid="cohort-json-apply"]').props('disabled')).toBe(true)
    })
  })

  describe('Validation feedback', () => {
    it('shows a syntax error for malformed JSON', async () => {
      const wrapper = mountComponent()

      await wrapper.find('textarea').setValue('{ oops')

      const error = wrapper.find('[data-testid="cohort-json-error"]')
      expect(error.exists()).toBe(true)
      expect(error.text()).toContain('Invalid JSON')
    })

    it('shows no error for valid JSON', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('[data-testid="cohort-json-error"]').exists()).toBe(false)
    })

    it('clears the error once the JSON is corrected', async () => {
      const wrapper = mountComponent()

      await wrapper.find('textarea').setValue('{ oops')
      expect(wrapper.find('[data-testid="cohort-json-error"]').exists()).toBe(true)

      await wrapper.find('textarea').setValue('{"ok": true}')
      expect(wrapper.find('[data-testid="cohort-json-error"]').exists()).toBe(false)
    })
  })

  describe('Copy', () => {
    it('copies the draft — not the original JSON — to the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const wrapper = mountComponent()
      await wrapper.find('textarea').setValue('{"edited": true}')
      await wrapper.find('[data-testid="cohort-json-copy"]').trigger('click')

      expect(writeText).toHaveBeenCalledWith('{"edited": true}')
    })

    it('reverts the button label from Copied after a couple of seconds', async () => {
      vi.useFakeTimers()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const wrapper = mountComponent()
      await wrapper.find('[data-testid="cohort-json-copy"]').trigger('click')
      await vi.advanceTimersByTimeAsync(0)
      expect(wrapper.find('[data-testid="cohort-json-copy"]').text()).toBe('Copied')

      await vi.advanceTimersByTimeAsync(2000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="cohort-json-copy"]').text()).toBe('Copy')

      vi.useRealTimers()
    })

    it('shows an error when the clipboard is unavailable', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      Object.assign(navigator, { clipboard: { writeText } })

      const wrapper = mountComponent()
      await wrapper.find('[data-testid="cohort-json-copy"]').trigger('click')

      await vi.waitFor(() =>
        expect(wrapper.find('[data-testid="cohort-json-error"]').text()).toContain(
          'Could not copy to clipboard'
        )
      )
    })
  })

  describe('Load file', () => {
    function selectFile(wrapper: ReturnType<typeof mountComponent>, file: File) {
      const input = wrapper.find('[data-testid="cohort-json-file-input"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      return input.trigger('change')
    }

    it('loads the file contents into the editor', async () => {
      const wrapper = mountComponent()
      const contents = '{"PrimaryCriteria": {"CriteriaList": []}}'

      await selectFile(wrapper, new File([contents], 'cohort.json', { type: 'application/json' }))
      // FileReader resolves asynchronously.
      await vi.waitFor(() =>
        expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(contents)
      )

      // Loading a file does not apply it — the user reviews it first.
      expect(wrapper.emitted('apply')).toBeFalsy()
    })

    it('reports an error and keeps the draft when the file is rejected', async () => {
      const wrapper = mountComponent()

      await selectFile(wrapper, new File(['nope'], 'cohort.txt', { type: 'text/plain' }))

      await vi.waitFor(() =>
        expect(wrapper.find('[data-testid="cohort-json-error"]').exists()).toBe(true)
      )
      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(VALID_JSON)
    })
  })

  describe('Download', () => {
    it('downloads the draft under the given filename', async () => {
      const createObjectURL = vi.fn(() => 'blob:fake')
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      const draft = '{"edited": true}'
      const wrapper = mountComponent({ filename: 'my_cohort.json' })
      await wrapper.find('textarea').setValue(draft)
      await wrapper.find('[data-testid="cohort-json-download"]').trigger('click')

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      // jsdom's Blob has no text(); assert on what it does expose.
      const blob = createObjectURL.mock.calls[0]![0] as Blob
      expect(blob.type).toBe('application/json')
      expect(blob.size).toBe(draft.length)
      expect(click).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')

      click.mockRestore()
    })
  })

  describe('Cancel', () => {
    it('closes without emitting apply', async () => {
      const wrapper = mountComponent()

      await wrapper.find('textarea').setValue('{"edited": true}')
      await wrapper.find('[data-testid="cohort-json-cancel"]').trigger('click')

      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
      expect(wrapper.emitted('apply')).toBeFalsy()
    })
  })
})
