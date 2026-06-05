import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AtlasStoryDocs from '@/components/ui/_story/AtlasStoryDocs.vue'

describe('AtlasStoryDocs', () => {
  it('renders the component name, description, and a props row', () => {
    const wrapper = mount(AtlasStoryDocs, {
      props: {
        name: 'AtlasButton',
        description: 'Primary action button.',
        props: [{ name: 'variant', type: 'string', default: 'primary', description: 'Visual style.' }],
        events: [{ name: 'click', payload: 'MouseEvent', description: 'Fired on click.' }],
        slots: [{ name: 'default', description: 'Button label.' }],
        usage: '<AtlasButton variant="primary">Save</AtlasButton>',
      },
    })
    expect(wrapper.text()).toContain('AtlasButton')
    expect(wrapper.text()).toContain('Primary action button.')
    expect(wrapper.text()).toContain('variant')
    expect(wrapper.text()).toContain('click')
    expect(wrapper.text()).toContain('default')
  })
})
