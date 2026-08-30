/**
 * The created-by / updated-by line shown in the asset editors (#269).
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import AssetAuthorship from '@/components/shared/AssetAuthorship.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

function mountIt(props: Record<string, unknown>) {
  return mount(AssetAuthorship, { props })
}

describe('AssetAuthorship', () => {
  it('names the creator and the date', () => {
    const w = mountIt({
      createdBy: { name: 'Jane Doe' },
      createdDate: '2026-03-01T00:00:00Z',
    })
    expect(w.get('[data-testid="asset-authorship-created"]').text()).toContain('Jane Doe')
    expect(w.get('[data-testid="asset-authorship-created"]').text()).toContain('03/01/2026')
  })

  it('adds the modifier once the asset has actually been modified', () => {
    const w = mountIt({
      createdBy: { name: 'Jane Doe' },
      createdDate: '2026-03-01T00:00:00Z',
      modifiedBy: { name: 'John Roe' },
      modifiedDate: '2026-06-02T00:00:00Z',
    })
    expect(w.get('[data-testid="asset-authorship-updated"]').text()).toContain('John Roe')
    expect(w.get('[data-testid="asset-authorship-updated"]').text()).toContain('06/02/2026')
  })

  it('says nothing about updates for an asset only ever created', () => {
    const w = mountIt({
      createdBy: { name: 'Jane Doe' },
      createdDate: '2026-03-01T00:00:00Z',
      modifiedBy: { name: 'Jane Doe' },
      modifiedDate: null,
    })
    expect(w.find('[data-testid="asset-authorship-updated"]').exists()).toBe(false)
  })

  it('still reports the date when the user is missing', () => {
    const w = mountIt({ createdDate: '2026-03-01T00:00:00Z' })
    expect(w.get('[data-testid="asset-authorship-created"]').text()).toContain('03/01/2026')
  })

  it('renders nothing at all when the asset carries neither', () => {
    expect(mountIt({}).find('[data-testid="asset-authorship"]').exists()).toBe(false)
  })
})
