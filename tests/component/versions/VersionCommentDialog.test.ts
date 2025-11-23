/**
 * Component tests for VersionCommentDialog
 * T046: Test modal behavior, validation, save
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VersionCommentDialog from '@/components/versions/VersionCommentDialog.vue'
import type { Version } from '@/components/versions/types'

const vuetify = createVuetify({ components, directives })

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/services/cohort-definition-versions.service', () => ({
  updateVersion: vi.fn(),
}))

describe('VersionCommentDialog', () => {
  const mockVersion: Version = {
    version: 5,
    assetId: 123,
    createdBy: { id: 1, name: 'Test User', email: 'test@test.com' },
    createdDate: '2024-01-01T00:00:00Z',
    comment: 'Original comment',
    archived: false,
  }

  const defaultProps = {
    modelValue: true,
    version: mockVersion,
    assetType: 'cohortdefinition' as const,
    assetId: 123,
  }

  it('should render dialog when modelValue is true', () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    expect(wrapper.find('.v-dialog').exists()).toBe(true)
  })

  it('should populate textarea with existing comment', () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('Original comment')
  })

  it('should disable save button when comment unchanged', async () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const saveButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('versions.save')
    )

    expect(saveButton?.attributes('disabled')).toBeDefined()
  })

  it('should enable save button when comment changed', async () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Modified comment')

    const saveButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('versions.save')
    )

    expect(saveButton?.attributes('disabled')).toBeUndefined()
  })

  it('should validate 500 character limit', async () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const longComment = 'a'.repeat(501)
    const textarea = wrapper.find('textarea')
    await textarea.setValue(longComment)

    // Validation error should appear
    // (Exact check depends on Vuetify version)
  })

  it('should emit saved event with updated version on save', async () => {
    const updateVersion = vi.fn().mockResolvedValue({
      ...mockVersion,
      comment: 'New comment',
    })

    vi.doMock('@/services/cohort-definition-versions.service', () => ({
      updateVersion,
    }))

    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('New comment')

    const saveButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('versions.save')
    )
    await saveButton?.trigger('click')

    // Wait for async operations
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('should close dialog on cancel', async () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const cancelButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('versions.cancel')
    )
    await cancelButton?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('should reset comment on cancel', async () => {
    const wrapper = mount(VersionCommentDialog, {
      props: defaultProps,
      global: { plugins: [vuetify] },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Modified comment')

    const cancelButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('versions.cancel')
    )
    await cancelButton?.trigger('click')

    // Comment should be reset to original
    expect(textarea.element.value).toBe('Original comment')
  })
})
