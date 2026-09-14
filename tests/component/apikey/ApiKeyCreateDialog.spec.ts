/**
 * ApiKeyCreateDialog component tests
 *
 * Covers the two-phase flow: form -> generate -> one-time raw key reveal ->
 * copy -> Done, plus validation and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/apikey.service', () => ({
  createApiKey: vi.fn(),
}))

const notify = { success: vi.fn(), danger: vi.fn() }
vi.mock('@/stores/notifications', () => ({
  useNotifications: () => notify,
}))

import { createApiKey } from '@/services/apikey.service'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import ApiKeyCreateDialog from '@/components/apikey/ApiKeyCreateDialog.vue'

const vuetify = createVuetify({ components, directives })

const sampleResult = {
  name: 'laptop',
  keyIdentifier: 'abc123',
  rawKey: 'wa_abc123_secret',
  createdAt: 1700000000,
  expiresAt: null,
}

function mountDialog() {
  return mount(ApiKeyCreateDialog, {
    global: { plugins: [vuetify] },
    attachTo: document.body,
    props: { modelValue: true },
  })
}

function setInput(testid: string, value: string) {
  const input = document.body.querySelector(`[data-testid="${testid}"] input`) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input'))
}

function click(testid: string) {
  (document.body.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement).click()
}

describe('ApiKeyCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders the create form fields', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(document.body.querySelector('[data-testid="apikey-create-name"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="apikey-create-description"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="apikey-create-expiration"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="apikey-create-generate"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('shows a validation error and does not call createApiKey when name is blank', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Name is required')
    wrapper.unmount()
  })

  it('defaults to never-expiring without touching the expiration select', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AtlasSelect' }).props('modelValue')).toBe('never')

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: undefined, expiresInDays: null })
    wrapper.unmount()
  })

  it('resolves a numeric preset directly, without requiring the custom-days field', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', '30')
    await flushPromises()
    expect(document.body.querySelector('[data-testid="apikey-create-custom-days"]')).toBeNull()

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: undefined, expiresInDays: 30 })
    wrapper.unmount()
  })

  it('resolves the custom expiration days and shows the raw key result', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'custom')
    await flushPromises()
    setInput('apikey-create-custom-days', '45')

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: undefined, expiresInDays: 45 })
    const rawKeyInput = document.body.querySelector('[data-testid="apikey-create-rawkey"] input') as HTMLInputElement
    expect(rawKeyInput.value).toBe('wa_abc123_secret')
    wrapper.unmount()
  })

  it('treats a blank custom days field as never-expiring', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'custom')
    await flushPromises()

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: undefined, expiresInDays: null })
    wrapper.unmount()
  })

  it('treats a zero or negative custom days value as never-expiring', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'custom')
    await flushPromises()
    setInput('apikey-create-custom-days', '0')

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: undefined, expiresInDays: null })
    wrapper.unmount()
  })

  it('trims the name and omits a blank-after-trim description', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', '  laptop  ')
    const descriptionArea = document.body.querySelector('[data-testid="apikey-create-description"] textarea') as HTMLTextAreaElement
    descriptionArea.value = '   '
    descriptionArea.dispatchEvent(new Event('input'))

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: undefined, expiresInDays: null })
    wrapper.unmount()
  })

  it('trims a non-blank description', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    const descriptionArea = document.body.querySelector('[data-testid="apikey-create-description"] textarea') as HTMLTextAreaElement
    descriptionArea.value = '  Dev laptop  '
    descriptionArea.dispatchEvent(new Event('input'))

    click('apikey-create-generate')
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ name: 'laptop', description: 'Dev laptop', expiresInDays: null })
    wrapper.unmount()
  })

  it('copies the raw key to the clipboard and notifies success', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    click('apikey-create-copy')
    await flushPromises()

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('wa_abc123_secret')
    expect(notify.success).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('emits update:modelValue=false and created when Done is clicked', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    click('apikey-create-done')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([false])
    expect(wrapper.emitted('created')).toHaveLength(1)
    wrapper.unmount()
  })

  it('closes without emitting created when Cancel is clicked before generating', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const cancelBtn = Array.from(document.body.querySelectorAll('.atlas-dialog__actions button')).find(b =>
      b.textContent?.toLowerCase().includes('cancel')
    ) as HTMLButtonElement | undefined
    expect(cancelBtn).toBeDefined()
    cancelBtn!.click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([false])
    expect(wrapper.emitted('created')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows an error alert and stays on the form when creation fails', async () => {
    vi.mocked(createApiKey).mockResolvedValue(failure(new ApiError('boom', 400, null)))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    expect(document.body.textContent).toContain('boom')
    expect(document.body.querySelector('[data-testid="apikey-create-rawkey"]')).toBeNull()
    wrapper.unmount()
  })

  it('marks Generate as loading only while the request is in flight', async () => {
    // Resolve with a failure so the component stays on the form view instead
    // of switching to the result view (which removes the Generate button).
    let resolveCreate!: (value: Awaited<ReturnType<typeof createApiKey>>) => void
    vi.mocked(createApiKey).mockReturnValue(
      new Promise(resolve => {
        resolveCreate = resolve
      })
    )
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    const generateBtn = document.body.querySelector('[data-testid="apikey-create-generate"]') as HTMLElement
    expect(generateBtn.classList.contains('v-btn--loading')).toBe(true)

    resolveCreate(failure(new ApiError('boom', 400, null)))
    await flushPromises()

    expect(generateBtn.classList.contains('v-btn--loading')).toBe(false)
    wrapper.unmount()
  })

  it('resets every field to its default when reopened after a previous successful generate', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    const descriptionArea = document.body.querySelector('[data-testid="apikey-create-description"] textarea') as HTMLTextAreaElement
    descriptionArea.value = 'Dev laptop'
    descriptionArea.dispatchEvent(new Event('input'))
    wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'custom')
    await flushPromises()
    setInput('apikey-create-custom-days', '45')

    click('apikey-create-generate')
    await flushPromises()
    expect(document.body.querySelector('[data-testid="apikey-create-rawkey"]')).not.toBeNull()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    expect(document.body.querySelector('[data-testid="apikey-create-rawkey"]')).toBeNull()
    const reopenedNameInput = document.body.querySelector('[data-testid="apikey-create-name"] input') as HTMLInputElement
    expect(reopenedNameInput.value).toBe('')
    const reopenedDescription = document.body.querySelector('[data-testid="apikey-create-description"] textarea') as HTMLTextAreaElement
    expect(reopenedDescription.value).toBe('')
    expect(wrapper.findComponent({ name: 'AtlasSelect' }).props('modelValue')).toBe('never')
    // The custom-days field only renders for the 'custom' preset, so its
    // absence here confirms expirationPreset was reset too.
    expect(document.body.querySelector('[data-testid="apikey-create-custom-days"]')).toBeNull()
    wrapper.unmount()
  })

  it('notifies danger when the clipboard copy rejects', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    click('apikey-create-copy')
    await flushPromises()

    expect(notify.danger).toHaveBeenCalled()
    expect(notify.success).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('treats a backdrop/esc dismissal while the raw key is showing as Done', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    // Simulate AtlasDialog forwarding a dismissal attempt (e.g. Esc) rather
    // than clicking the explicit Done button.
    wrapper.findComponent({ name: 'AtlasDialog' }).vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([false])
    expect(wrapper.emitted('created')).toHaveLength(1)
    wrapper.unmount()
  })

  it('forwards a plain open update while the raw key is showing without treating it as Done', async () => {
    vi.mocked(createApiKey).mockResolvedValue(success(sampleResult))
    const wrapper = mountDialog()
    await flushPromises()

    setInput('apikey-create-name', 'laptop')
    click('apikey-create-generate')
    await flushPromises()

    // AtlasDialog re-forwarding `true` (still open) must pass straight
    // through, not be mistaken for a dismissal attempt.
    wrapper.findComponent({ name: 'AtlasDialog' }).vm.$emit('update:modelValue', true)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([true])
    expect(wrapper.emitted('created')).toBeUndefined()
    wrapper.unmount()
  })
})
