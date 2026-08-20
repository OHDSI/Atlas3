/**
 * Mock report data for E2E tests
 * Provides report metadata and sample data
 */

export interface MockReport {
  id: number
  name: string
  reportType: 'dashboard' | 'person' | 'dataDensity' | 'achillesHeel'
  sourceId: number
  createdDate: string
}

/**
 * Standard reports for testing
 */
export const mockReports: MockReport[] = [
  {
    id: 1,
    name: 'SYNPUF1K Dashboard',
    reportType: 'dashboard',
    sourceId: 6,
    createdDate: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'SYNPUF1K Person Report',
    reportType: 'person',
    sourceId: 6,
    createdDate: '2024-01-02T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'SYNPUF1K Data Density',
    reportType: 'dataDensity',
    sourceId: 6,
    createdDate: '2024-01-03T00:00:00.000Z'
  }
]

/**
 * Data density report structure
 */
export interface MockDataDensityReport {
  series: Array<{
    name: string
    data: Array<{ x: string; y: number }>
  }>
}

export const mockDataDensityReport: MockDataDensityReport = {
  series: [
    {
      name: 'Condition',
      data: [
        { x: '2010', y: 1000 },
        { x: '2011', y: 1200 },
        { x: '2012', y: 1500 },
        { x: '2013', y: 1800 },
        { x: '2014', y: 2000 }
      ]
    },
    {
      name: 'Drug',
      data: [
        { x: '2010', y: 800 },
        { x: '2011', y: 900 },
        { x: '2012', y: 1100 },
        { x: '2013', y: 1300 },
        { x: '2014', y: 1500 }
      ]
    },
    {
      name: 'Procedure',
      data: [
        { x: '2010', y: 500 },
        { x: '2011', y: 600 },
        { x: '2012', y: 700 },
        { x: '2013', y: 800 },
        { x: '2014', y: 900 }
      ]
    }
  ]
}

/**
 * Clinical domains report structure
 */
export interface MockClinicalDomainsReport {
  domains: Array<{
    domainId: string
    recordCount: number
    personCount: number
  }>
}

export const mockClinicalDomainsReport: MockClinicalDomainsReport = {
  domains: [
    { domainId: 'Condition', recordCount: 50000, personCount: 1000 },
    { domainId: 'Drug', recordCount: 80000, personCount: 950 },
    { domainId: 'Procedure', recordCount: 30000, personCount: 800 },
    { domainId: 'Measurement', recordCount: 100000, personCount: 900 },
    { domainId: 'Observation', recordCount: 20000, personCount: 700 }
  ]
}
