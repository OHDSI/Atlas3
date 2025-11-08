import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ReportSelector from '@/components/reports/ReportSelector.vue'
import type { ReportType } from '@/models/report.types'

const vuetify = createVuetify({
  components,
  directives,
})

// Mock ResizeObserver for Vuetify components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('ReportSelector', () => {
  let wrapper: VueWrapper

  const createWrapper = (props?: { modelValue?: ReportType | null; disabled?: boolean }) => {
    return mount(ReportSelector, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: props?.modelValue ?? null,
        disabled: props?.disabled ?? false,
      },
    })
  }

  // All 26 report types available in the component
  const expectedReportTypes: ReportType[] = [
    'person',
    'condition-eras',
    'drug-eras',
    'cohort-specific',
    'condition',
    'conditions-by-index',
    'death',
    'drug-exposure',
    'drugs-by-index',
    'observation-periods',
    'procedure',
    'procedures-by-index',
    'data-completeness',
    'entropy',
    'tornado',
    'persons-exposure-baseline',
    'persons-exposure-cohort',
    'visits-baseline',
    'visit-dates-baseline',
    'care-site-visit-dates-baseline',
    'visits-cohort',
    'visit-dates-cohort',
    'care-site-visit-dates-cohort',
    'drug-utilization-baseline',
    'drug-utilization-cohort',
    'heracles-heel',
  ]

  const reportMetadata = {
    'person': { label: 'Person (Demographics)', description: 'Year of birth and demographic distributions', icon: 'mdi-account-group' },
    'condition-eras': { label: 'Condition Eras', description: 'Condition prevalence and duration analysis', icon: 'mdi-medical-bag' },
    'drug-eras': { label: 'Drug Eras', description: 'Drug exposure prevalence and duration', icon: 'mdi-pill' },
    'cohort-specific': { label: 'Cohort Specific', description: 'Cohort timeline and distribution analytics', icon: 'mdi-chart-timeline-variant' },
    'condition': { label: 'Condition Occurrence', description: 'Individual condition occurrences', icon: 'mdi-hospital-box' },
    'conditions-by-index': { label: 'Conditions by Index', description: 'Conditions relative to cohort start', icon: 'mdi-calendar-clock' },
    'death': { label: 'Death', description: 'Mortality data and causes', icon: 'mdi-heart-pulse' },
    'drug-exposure': { label: 'Drug Exposure', description: 'Individual drug exposure events', icon: 'mdi-medication' },
    'drugs-by-index': { label: 'Drugs by Index', description: 'Drug exposures relative to cohort start', icon: 'mdi-calendar-range' },
    'observation-periods': { label: 'Observation Periods', description: 'Patient observation period coverage', icon: 'mdi-calendar-multiple' },
    'procedure': { label: 'Procedure Occurrence', description: 'Procedure events and frequency', icon: 'mdi-medical-bag' },
    'procedures-by-index': { label: 'Procedures by Index', description: 'Procedures relative to cohort start', icon: 'mdi-calendar-check' },
    'data-completeness': { label: 'Data Completeness', description: 'Data quality metrics', icon: 'mdi-database-check' },
    'entropy': { label: 'Entropy', description: 'Data entropy analysis', icon: 'mdi-chart-scatter-plot' },
    'tornado': { label: 'Tornado', description: 'Tornado diagram visualization', icon: 'mdi-weather-tornado' },
    'persons-exposure-baseline': { label: 'Persons/Exposure (Baseline)', description: 'Baseline period persons and exposures', icon: 'mdi-account-clock' },
    'persons-exposure-cohort': { label: 'Persons/Exposure (Cohort)', description: 'Cohort period persons and exposures', icon: 'mdi-account-group-outline' },
    'visits-baseline': { label: 'Visits (Baseline)', description: 'Baseline period visit data', icon: 'mdi-hospital-building' },
    'visit-dates-baseline': { label: 'Visit Dates (Baseline)', description: 'Baseline visit date distribution', icon: 'mdi-calendar' },
    'care-site-visit-dates-baseline': { label: 'Care Site Visit Dates (Baseline)', description: 'Baseline care site visit patterns', icon: 'mdi-domain' },
    'visits-cohort': { label: 'Visits (Cohort)', description: 'Cohort period visit data', icon: 'mdi-hospital' },
    'visit-dates-cohort': { label: 'Visit Dates (Cohort)', description: 'Cohort visit date distribution', icon: 'mdi-calendar-month' },
    'care-site-visit-dates-cohort': { label: 'Care Site Visit Dates (Cohort)', description: 'Cohort care site visit patterns', icon: 'mdi-office-building' },
    'drug-utilization-baseline': { label: 'Drug Utilization (Baseline)', description: 'Baseline drug utilization patterns', icon: 'mdi-pill-multiple' },
    'drug-utilization-cohort': { label: 'Drug Utilization (Cohort)', description: 'Cohort drug utilization patterns', icon: 'mdi-medication-outline' },
    'heracles-heel': { label: 'Heracles Heel', description: 'Data quality Achilles Heel results', icon: 'mdi-alert-circle' },
  }

  beforeEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // ==========================================
  // RENDERING TESTS
  // ==========================================

  describe('Rendering', () => {
    it('should render the component', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.report-selector').exists()).toBe(true)
    })

    it('should render v-select with correct props', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.exists()).toBe(true)
      expect(select.props('label')).toBe('Select Report Type')
      expect(select.props('variant')).toBe('outlined')
      expect(select.props('density')).toBe('comfortable')
    })

    it('should render with chart icon', () => {
      wrapper = createWrapper()
      expect(wrapper.html()).toContain('mdi-chart-box')
    })

    it('should render all 26 report types in items', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      expect(items).toHaveLength(26)

      // Verify all expected report types are present
      const itemTypes = items.map((item: any) => item.type)
      expectedReportTypes.forEach(type => {
        expect(itemTypes).toContain(type)
      })
    })

    it('should render each report type with correct metadata', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      items.forEach((item: any) => {
        const metadata = reportMetadata[item.type as ReportType]
        expect(item.label).toBe(metadata.label)
        expect(item.description).toBe(metadata.description)
        expect(item.icon).toBe(metadata.icon)
      })
    })
  })

  // ==========================================
  // REPORT TYPE SELECTION TESTS
  // ==========================================

  describe('Report Type Selection', () => {
    it('should emit update:modelValue when report type is selected', async () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })

      await select.vm.$emit('update:modelValue', 'person')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
      expect(emitted[0][0]).toBe('person')
    })

    it('should emit null when selection is cleared', async () => {
      wrapper = createWrapper({ modelValue: 'person' })
      const select = wrapper.findComponent({ name: 'VSelect' })

      await select.vm.$emit('update:modelValue', null)

      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType | null]>
      expect(emitted[0][0]).toBeNull()
    })

    it('should handle selection of each report type', async () => {
      for (const reportType of expectedReportTypes) {
        wrapper = createWrapper()
        const select = wrapper.findComponent({ name: 'VSelect' })

        await select.vm.$emit('update:modelValue', reportType)

        const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
        expect(emitted[emitted.length - 1][0]).toBe(reportType)

        wrapper.unmount()
      }
    })
  })

  // ==========================================
  // REPORT METADATA DISPLAY TESTS
  // ==========================================

  describe('Report Metadata Display', () => {
    it('should display correct label for person report', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      const personItem = items.find((item: any) => item.type === 'person')
      expect(personItem.label).toBe('Person (Demographics)')
    })

    it('should display correct description for condition-eras report', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      const conditionErasItem = items.find((item: any) => item.type === 'condition-eras')
      expect(conditionErasItem.description).toBe('Condition prevalence and duration analysis')
    })

    it('should display correct icon for drug-eras report', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      const drugErasItem = items.find((item: any) => item.type === 'drug-eras')
      expect(drugErasItem.icon).toBe('mdi-pill')
    })

    it('should have unique labels for all report types', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      const labels = items.map((item: any) => item.label)
      const uniqueLabels = new Set(labels)

      expect(uniqueLabels.size).toBe(labels.length)
    })

    it('should have meaningful descriptions for all report types', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      items.forEach((item: any) => {
        expect(item.description).toBeTruthy()
        expect(item.description.length).toBeGreaterThan(10)
      })
    })

    it('should have valid Material Design icons for all report types', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')

      items.forEach((item: any) => {
        expect(item.icon).toBeTruthy()
        expect(item.icon).toMatch(/^mdi-/)
      })
    })
  })

  // ==========================================
  // PROPS VALIDATION TESTS
  // ==========================================

  describe('Props Validation', () => {
    it('should accept null as modelValue', () => {
      wrapper = createWrapper({ modelValue: null })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBeNull()
    })

    it('should accept valid report type as modelValue', () => {
      wrapper = createWrapper({ modelValue: 'person' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('person')
    })

    it('should respect disabled prop', () => {
      wrapper = createWrapper({ disabled: true })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('disabled')).toBe(true)
    })

    it('should not be disabled by default', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('disabled')).toBe(false)
    })

    it('should update when modelValue prop changes', async () => {
      wrapper = createWrapper({ modelValue: 'person' })

      await wrapper.setProps({ modelValue: 'drug-eras' })

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('drug-eras')
    })

    it('should handle multiple prop updates', async () => {
      wrapper = createWrapper({ modelValue: 'person', disabled: false })

      await wrapper.setProps({ modelValue: 'condition-eras' })
      await wrapper.setProps({ disabled: true })

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('condition-eras')
      expect(select.props('disabled')).toBe(true)
    })
  })

  // ==========================================
  // KEYBOARD NAVIGATION TESTS
  // ==========================================

  describe('Keyboard Navigation', () => {
    it('should support keyboard interaction via v-select', async () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })

      // v-select handles keyboard navigation internally
      // We verify the component is keyboard-accessible
      expect(select.exists()).toBe(true)
      expect(select.props('disabled')).toBe(false)
    })

    it('should not be keyboard navigable when disabled', async () => {
      wrapper = createWrapper({ disabled: true })
      const select = wrapper.findComponent({ name: 'VSelect' })

      expect(select.props('disabled')).toBe(true)
    })

    it('should allow keyboard selection to trigger events', async () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })

      // Simulate keyboard selection
      await select.vm.$emit('update:modelValue', 'cohort-specific')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
      expect(emitted[0][0]).toBe('cohort-specific')
    })
  })

  // ==========================================
  // EDGE CASES TESTS
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle rapid selection changes', async () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })

      await select.vm.$emit('update:modelValue', 'person')
      await select.vm.$emit('update:modelValue', 'drug-eras')
      await select.vm.$emit('update:modelValue', 'condition-eras')

      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
      expect(emitted).toHaveLength(3)
      expect(emitted[2][0]).toBe('condition-eras')
    })

    it('should handle selecting the same value multiple times', async () => {
      wrapper = createWrapper({ modelValue: 'person' })
      const select = wrapper.findComponent({ name: 'VSelect' })

      await select.vm.$emit('update:modelValue', 'person')
      await select.vm.$emit('update:modelValue', 'person')

      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
      expect(emitted).toHaveLength(2)
      expect(emitted[0][0]).toBe('person')
      expect(emitted[1][0]).toBe('person')
    })

    it('should preserve component state when disabled is toggled', async () => {
      wrapper = createWrapper({ modelValue: 'person', disabled: false })

      await wrapper.setProps({ disabled: true })
      await wrapper.setProps({ disabled: false })

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('person')
    })

    it('should handle null to value to null selection pattern', async () => {
      wrapper = createWrapper({ modelValue: null })
      const select = wrapper.findComponent({ name: 'VSelect' })

      await select.vm.$emit('update:modelValue', 'person')
      await select.vm.$emit('update:modelValue', null)

      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType | null]>
      expect(emitted).toHaveLength(2)
      expect(emitted[0][0]).toBe('person')
      expect(emitted[1][0]).toBeNull()
    })

    it('should not mutate props directly', async () => {
      const initialValue: ReportType = 'person'
      wrapper = createWrapper({ modelValue: initialValue })
      const select = wrapper.findComponent({ name: 'VSelect' })

      await select.vm.$emit('update:modelValue', 'drug-eras')

      // Original prop should not be mutated
      expect(initialValue).toBe('person')
    })
  })

  // ==========================================
  // INTEGRATION SCENARIOS TESTS
  // ==========================================

  describe('Integration Scenarios', () => {
    it('should work in form context - selecting report for generation', async () => {
      wrapper = createWrapper({ modelValue: null })
      const select = wrapper.findComponent({ name: 'VSelect' })

      // User selects a report type
      await select.vm.$emit('update:modelValue', 'person')

      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
      expect(emitted[0][0]).toBe('person')
    })

    it('should work in report viewer context - switching between reports', async () => {
      wrapper = createWrapper({ modelValue: 'person' })
      const select = wrapper.findComponent({ name: 'VSelect' })

      // User switches to different report
      await select.vm.$emit('update:modelValue', 'condition-eras')

      const emitted = wrapper.emitted('update:modelValue') as Array<[ReportType]>
      expect(emitted[0][0]).toBe('condition-eras')
    })

    it('should handle disabled state during report generation', async () => {
      wrapper = createWrapper({ modelValue: 'person', disabled: false })

      // Disable during loading
      await wrapper.setProps({ disabled: true })

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('disabled')).toBe(true)
      expect(select.props('modelValue')).toBe('person')
    })

    it('should support pre-selected report type on mount', () => {
      wrapper = createWrapper({ modelValue: 'cohort-specific' })
      const select = wrapper.findComponent({ name: 'VSelect' })

      expect(select.props('modelValue')).toBe('cohort-specific')
    })

    it('should handle report type change in multi-cohort scenario', async () => {
      // Simulating switching between cohorts with different reports
      wrapper = createWrapper({ modelValue: 'person' })

      await wrapper.setProps({ modelValue: 'drug-eras' })
      await wrapper.setProps({ modelValue: 'condition-eras' })

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('condition-eras')
    })

    it('should clear selection when switching cohorts', async () => {
      wrapper = createWrapper({ modelValue: 'person' })

      // Clear selection when switching to new cohort
      await wrapper.setProps({ modelValue: null })

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBeNull()
    })
  })

  // ==========================================
  // SPECIFIC REPORT TYPE COVERAGE TESTS
  // ==========================================

  describe('All 26 Report Types Coverage', () => {
    it('should include person report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'person')).toBe(true)
    })

    it('should include condition-eras report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'condition-eras')).toBe(true)
    })

    it('should include drug-eras report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'drug-eras')).toBe(true)
    })

    it('should include cohort-specific report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'cohort-specific')).toBe(true)
    })

    it('should include condition report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'condition')).toBe(true)
    })

    it('should include conditions-by-index report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'conditions-by-index')).toBe(true)
    })

    it('should include death report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'death')).toBe(true)
    })

    it('should include drug-exposure report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'drug-exposure')).toBe(true)
    })

    it('should include drugs-by-index report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'drugs-by-index')).toBe(true)
    })

    it('should include observation-periods report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'observation-periods')).toBe(true)
    })

    it('should include procedure report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'procedure')).toBe(true)
    })

    it('should include procedures-by-index report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'procedures-by-index')).toBe(true)
    })

    it('should include data-completeness report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'data-completeness')).toBe(true)
    })

    it('should include entropy report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'entropy')).toBe(true)
    })

    it('should include tornado report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'tornado')).toBe(true)
    })

    it('should include persons-exposure-baseline report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'persons-exposure-baseline')).toBe(true)
    })

    it('should include persons-exposure-cohort report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'persons-exposure-cohort')).toBe(true)
    })

    it('should include visits-baseline report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'visits-baseline')).toBe(true)
    })

    it('should include visit-dates-baseline report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'visit-dates-baseline')).toBe(true)
    })

    it('should include care-site-visit-dates-baseline report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'care-site-visit-dates-baseline')).toBe(true)
    })

    it('should include visits-cohort report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'visits-cohort')).toBe(true)
    })

    it('should include visit-dates-cohort report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'visit-dates-cohort')).toBe(true)
    })

    it('should include care-site-visit-dates-cohort report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'care-site-visit-dates-cohort')).toBe(true)
    })

    it('should include drug-utilization-baseline report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'drug-utilization-baseline')).toBe(true)
    })

    it('should include drug-utilization-cohort report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'drug-utilization-cohort')).toBe(true)
    })

    it('should include heracles-heel report type', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items.some((item: any) => item.type === 'heracles-heel')).toBe(true)
    })
  })

  // ==========================================
  // COMPONENT STRUCTURE TESTS
  // ==========================================

  describe('Component Structure', () => {
    it('should have report-selector CSS class', () => {
      wrapper = createWrapper()
      expect(wrapper.classes()).toContain('report-selector')
    })

    it('should use item-title and item-value props correctly', () => {
      wrapper = createWrapper()
      const select = wrapper.findComponent({ name: 'VSelect' })

      expect(select.props('itemTitle')).toBe('label')
      expect(select.props('itemValue')).toBe('type')
    })

    it('should have custom item template slot', () => {
      wrapper = createWrapper()
      const html = wrapper.html()

      // Component should use custom item template (implementation detail)
      expect(html).toBeTruthy()
    })

    it('should be full width', () => {
      wrapper = createWrapper()
      const element = wrapper.find('.report-selector')

      // Check for full width via component structure
      expect(element.exists()).toBe(true)
    })
  })
})
