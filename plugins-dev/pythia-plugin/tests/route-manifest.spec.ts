import { describe, it, expect } from 'vitest'
import {
  agentVisibleViews,
  fullManifest,
  getViewLabel,
  getViewParams,
  isAgentVisibleView,
} from '../src/route-manifest'

describe('route-manifest', () => {
  it('agentVisibleViews returns a non-empty list of route names', () => {
    const views = agentVisibleViews()
    expect(views.length).toBeGreaterThan(20)
    expect(views).toContain('cohort-edit')
    expect(views).toContain('characterization-results')
  })

  it('isAgentVisibleView returns false for hidden routes', () => {
    expect(isAgentVisibleView('cohort-edit')).toBe(true)
    expect(isAgentVisibleView('oauth-callback')).toBe(false)
    expect(isAgentVisibleView('totally-made-up')).toBe(false)
  })

  it('getViewParams returns the param keys for a route', () => {
    expect(getViewParams('cohort-edit')).toEqual(['id'])
    expect(getViewParams('concept-detail')).toEqual(['sourceKey', 'conceptId'])
    expect(getViewParams('home')).toEqual([])
  })

  it('getViewLabel returns the agentLabel when set', () => {
    expect(getViewLabel('cohort-edit')).toBe('Cohort editor')
    expect(getViewLabel('home')).toBe('Home')
  })

  it('getViewLabel falls back to the name for unknown routes', () => {
    expect(getViewLabel('totally-made-up')).toBe('totally-made-up')
  })

  it('fullManifest returns the loaded JSON entries', () => {
    const m = fullManifest()
    expect(Array.isArray(m)).toBe(true)
    expect(m.length).toBeGreaterThan(30)
    const entry = m.find(r => r.name === 'cohort-edit')
    expect(entry).toBeDefined()
    expect(entry?.agentVisible).toBe(true)
  })
})
