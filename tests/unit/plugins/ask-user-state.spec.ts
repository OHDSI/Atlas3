import { describe, it, expect, beforeEach } from 'vitest'
import type { AskState } from '../../../plugins-dev/pythia-plugin/src/types'

// We only exercise the pure shape transitions here. The chat-session
// branch that wires the tool-call into asks.value lives in chat-session.ts
// and is integration-tested via the e2e flow; here we cover the state
// transitions an AskUserCard's parent component performs on click.

function makeAsk(): AskState {
  return {
    id: 'tc-1',
    question: 'Update the current cohort or create a new one?',
    options: [
      { id: 'update', label: 'Update the current cohort' },
      { id: 'new', label: 'Create a new cohort' },
    ],
    allowCustom: false,
    status: 'pending',
  }
}

describe('AskState transitions', () => {
  let ask: AskState
  beforeEach(() => {
    ask = makeAsk()
  })

  it('answer transitions status to answered and records chosen option', () => {
    const answer = { id: 'update', label: 'Update the current cohort' }
    ask.status = 'answered'
    ask.chosen = answer
    expect(ask.status).toBe('answered')
    expect(ask.chosen).toEqual(answer)
  })

  it('typed-reply marker uses (typed reply) as the chosen label', () => {
    ask.status = 'answered'
    ask.chosen = { label: '(typed reply)' }
    expect(ask.chosen.id).toBeUndefined()
    expect(ask.chosen.label).toBe('(typed reply)')
  })

  it('pending asks have undefined chosen', () => {
    expect(ask.chosen).toBeUndefined()
    expect(ask.status).toBe('pending')
  })

  it('custom answer carries the typed text in label and no id', () => {
    ask.status = 'answered'
    ask.chosen = { label: 'Combine both — keep the open one and add a sibling' }
    expect(ask.chosen.id).toBeUndefined()
    expect(ask.chosen.label).toMatch(/Combine both/)
  })

  it('options preserve id, label, and optional description', () => {
    const a: AskState = {
      ...makeAsk(),
      options: [
        { id: 'a', label: 'Yes', description: 'Proceed and apply' },
        { id: 'b', label: 'No' },
      ],
    }
    expect(a.options[0].description).toBe('Proceed and apply')
    expect(a.options[1].description).toBeUndefined()
  })
})
