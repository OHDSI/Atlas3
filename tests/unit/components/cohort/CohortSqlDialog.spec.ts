/**
 * CohortSqlDialog Component Tests (#321)
 *
 * The dialog reads the cohort's SQL rather than editing it. On open it fetches
 * OHDSI template SQL — parameters left unresolved, which is the portable form —
 * and translates to a database dialect only when one is chosen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    tv: (key: string, fallback?: string) => fallback || key,
  }),
}))

const mockGenerateCohortSql = vi.fn()
const mockTranslateSql = vi.fn()

vi.mock('@/services/cohort-sql.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/cohort-sql.service')>(
    '@/services/cohort-sql.service'
  )
  return {
    ...actual,
    generateCohortSql: (...args: unknown[]) => mockGenerateCohortSql(...args),
    translateSql: (...args: unknown[]) => mockTranslateSql(...args),
  }
})

import CohortSqlDialog from '@/components/cohort/CohortSqlDialog.vue'
import { defaultExpression } from '@/models/circe-types'

const vuetify = createVuetify({ components, directives })

const TEMPLATE_SQL = 'SELECT * FROM @cdm_database_schema.person'
const TRANSLATED_SQL = 'SELECT * FROM cdm.person'

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(CohortSqlDialog, {
    props: {
      modelValue: true,
      expression: defaultExpression,
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="actions" /></div>',
        },
      },
    },
  })
}

function sqlText(wrapper: ReturnType<typeof mountComponent>): string {
  return (wrapper.find('[data-testid="cohort-sql-field"] textarea').element as HTMLTextAreaElement)
    .value
}

describe('CohortSqlDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateCohortSql.mockResolvedValue({ success: true, data: TEMPLATE_SQL })
    mockTranslateSql.mockResolvedValue({ success: true, data: TRANSLATED_SQL })
  })

  it('fetches and shows the template SQL when opened', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(mockGenerateCohortSql).toHaveBeenCalledWith(defaultExpression)
    expect(sqlText(wrapper)).toBe(TEMPLATE_SQL)
  })

  it('does not translate until a dialect is chosen', async () => {
    mountComponent()
    await flushPromises()

    expect(mockTranslateSql).not.toHaveBeenCalled()
  })

  it('translates the template when a dialect is chosen', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.findComponent({ name: 'AtlasSelect' }).setValue('postgresql')
    await flushPromises()

    expect(mockTranslateSql).toHaveBeenCalledWith(TEMPLATE_SQL, 'postgresql')
    expect(sqlText(wrapper)).toBe(TRANSLATED_SQL)
  })

  it('returns to the untranslated template when the dialect is cleared', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.findComponent({ name: 'AtlasSelect' }).setValue('postgresql')
    await flushPromises()
    await wrapper.findComponent({ name: 'AtlasSelect' }).setValue(null)
    await flushPromises()

    expect(sqlText(wrapper)).toBe(TEMPLATE_SQL)
    // Going back to the template is local; it must not re-fetch.
    expect(mockGenerateCohortSql).toHaveBeenCalledTimes(1)
  })

  it("surfaces the server's message when the SQL cannot be built", async () => {
    mockGenerateCohortSql.mockResolvedValue({
      success: false,
      error: { message: 'HTTP 500: Cannot invoke getCriteriaList()' },
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="cohort-sql-error"]').text()).toContain(
      'Cannot invoke getCriteriaList()'
    )
  })

  it('surfaces a translation failure without discarding the template', async () => {
    mockTranslateSql.mockResolvedValue({
      success: false,
      error: { message: 'HTTP 500: unknown dialect' },
    })

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.findComponent({ name: 'AtlasSelect' }).setValue('postgresql')
    await flushPromises()

    expect(wrapper.find('[data-testid="cohort-sql-error"]').text()).toContain('unknown dialect')
    expect(sqlText(wrapper)).toBe(TEMPLATE_SQL)
  })

  it('copies the SQL on screen', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('[data-testid="cohort-sql-copy"]').trigger('click')

    expect(writeText).toHaveBeenCalledWith(TEMPLATE_SQL)
  })

  it('downloads the SQL on screen as a .sql file', async () => {
    const createObjectURL = vi.fn(() => 'blob:sql')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountComponent({ filename: 'my_cohort.sql' })
    await flushPromises()
    await wrapper.find('[data-testid="cohort-sql-download"]').trigger('click')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    // jsdom's Blob has no text(); assert on what it does expose.
    const blob = createObjectURL.mock.calls[0]![0] as Blob
    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(TEMPLATE_SQL.length)
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:sql')

    click.mockRestore()
  })

  it('downloads the translated SQL once a dialect is chosen', async () => {
    const createObjectURL = vi.fn(() => 'blob:sql')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.findComponent({ name: 'AtlasSelect' }).setValue('postgresql')
    await flushPromises()
    await wrapper.find('[data-testid="cohort-sql-download"]').trigger('click')

    expect((createObjectURL.mock.calls[0]![0] as Blob).size).toBe(TRANSLATED_SQL.length)

    click.mockRestore()
  })

  it('re-fetches on each open, so an edited cohort does not show stale SQL', async () => {
    const wrapper = mountComponent({ modelValue: false })
    await flushPromises()
    expect(mockGenerateCohortSql).not.toHaveBeenCalled()

    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(mockGenerateCohortSql).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(mockGenerateCohortSql).toHaveBeenCalledTimes(2)
  })
})
