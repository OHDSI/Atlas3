import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { proposals, lastNavigation, sessionRouteContext } from '../src/chat-session'

describe('navigate_to short-circuit', () => {
  beforeEach(() => {
    for (const k of Object.keys(proposals.value)) delete proposals.value[k]
  })

  it('does NOT create a proposal card for navigate_to', async () => {
    const { handleNavigateTool } = await import('../src/chat-session')
    const addToolResult = vi.fn()
    const applyProposalSpy = vi.fn()

    handleNavigateTool({
      toolCallId: 'tc-1',
      input: { view: 'cohort-edit', id: 42, reason: 'open cohort 42' },
    }, { addToolResult, applyProposal: applyProposalSpy })

    expect(proposals.value['tc-1']).toBeUndefined()
    expect(applyProposalSpy).toHaveBeenCalledWith({
      kind: 'navigate',
      route: { name: 'cohort-edit', params: { id: 42 } },
      reason: 'open cohort 42',
    })
    expect(addToolResult).toHaveBeenCalledWith({
      tool: 'navigate_to',
      toolCallId: 'tc-1',
      output: expect.objectContaining({
        success: true,
        applied: true,
        route: 'cohort-edit',
      }),
    })
  })

  it('rejects navigate_to with an invalid view', async () => {
    const { handleNavigateTool } = await import('../src/chat-session')
    const addToolResult = vi.fn()
    const applyProposalSpy = vi.fn()

    handleNavigateTool({
      toolCallId: 'tc-2',
      input: { view: 'not-a-real-view', reason: 'x' },
    }, { addToolResult, applyProposal: applyProposalSpy })

    expect(applyProposalSpy).not.toHaveBeenCalled()
    expect(addToolResult).toHaveBeenCalledWith({
      tool: 'navigate_to',
      toolCallId: 'tc-2',
      output: expect.objectContaining({ success: false }),
    })
  })
})

describe('navigate_to captures previous route for undo', () => {
  beforeEach(() => {
    lastNavigation.value = null
    sessionRouteContext.value = null
    for (const k of Object.keys(proposals.value)) delete proposals.value[k]
  })

  it('records previous route when sessionRouteContext is set', async () => {
    const { handleNavigateTool } = await import('../src/chat-session')
    sessionRouteContext.value = {
      routeName: 'cohorts',
      routeParams: {},
      artifact: null,
    }
    handleNavigateTool(
      { toolCallId: 'tc-nav', input: { view: 'cohort-edit', id: 42, reason: 'r' } },
      { addToolResult: () => {}, applyProposal: () => {} }
    )
    expect(lastNavigation.value).not.toBeNull()
    expect(lastNavigation.value?.toName).toBe('cohort-edit')
    expect(lastNavigation.value?.previous).toEqual({ name: 'cohorts', params: {} })
  })

  it('records null previous when sessionRouteContext is missing', async () => {
    const { handleNavigateTool } = await import('../src/chat-session')
    sessionRouteContext.value = null
    handleNavigateTool(
      { toolCallId: 'tc-nav-2', input: { view: 'cohort-edit', id: 1, reason: 'r' } },
      { addToolResult: () => {}, applyProposal: () => {} }
    )
    expect(lastNavigation.value?.previous).toBeNull()
  })

  it('reports undoAvailable: false in tool result when no previous', async () => {
    const { handleNavigateTool } = await import('../src/chat-session')
    sessionRouteContext.value = null
    const addToolResult = vi.fn()
    handleNavigateTool(
      { toolCallId: 'tc-nav-3', input: { view: 'cohort-edit', id: 1, reason: 'r' } },
      { addToolResult, applyProposal: () => {} }
    )
    expect(addToolResult).toHaveBeenCalledWith({
      tool: 'navigate_to',
      toolCallId: 'tc-nav-3',
      output: expect.objectContaining({ undoAvailable: false }),
    })
  })
})

describe('proposal timers cleared on session switch', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('newChat clears pending proposal timers (10-min fallback does not fire)', async () => {
    vi.useFakeTimers()
    const { recordProposal, newChat } = await import('../src/chat-session')
    const addToolResult = vi.fn()
    recordProposal(
      { toolCallId: 'leak-1', toolName: 'add_criteria', input: {} },
      { addToolResult }
    )
    // Sanity: nothing fired yet
    expect(addToolResult).not.toHaveBeenCalled()
    // Switching/clearing should drop the timer
    newChat()
    // Advance well past the 10-minute fallback
    vi.advanceTimersByTime(11 * 60 * 1000)
    expect(addToolResult).not.toHaveBeenCalled()
  })
})

describe('proposal tool defers tool-result', () => {
  beforeEach(() => {
    for (const k of Object.keys(proposals.value)) delete proposals.value[k]
  })

  it('does NOT stub the tool-result on tool-call (deferred)', async () => {
    const { recordProposal } = await import('../src/chat-session')
    const addToolResult = vi.fn()
    recordProposal({
      toolCallId: 'tc-p1',
      toolName: 'add_criteria',
      input: { name: 'Test', group: 'inclusion', logic: 'AND', items: [] },
    }, { addToolResult })
    expect(proposals.value['tc-p1']).toBeDefined()
    expect(proposals.value['tc-p1'].status).toBe('pending')
    expect(addToolResult).not.toHaveBeenCalled()
  })

  it('stubs tool-result on accept', async () => {
    const { recordProposal, resolveProposal } = await import('../src/chat-session')
    const addToolResult = vi.fn()
    recordProposal({
      toolCallId: 'tc-p2',
      toolName: 'add_criteria',
      input: { name: 'Test', group: 'inclusion', logic: 'AND', items: [] },
    }, { addToolResult })
    resolveProposal('tc-p2', 'accepted', { addToolResult })
    expect(addToolResult).toHaveBeenCalledWith({
      tool: 'add_criteria',
      toolCallId: 'tc-p2',
      output: expect.objectContaining({ decision: 'accepted' }),
    })
  })

  it('stubs tool-result on reject', async () => {
    const { recordProposal, resolveProposal } = await import('../src/chat-session')
    const addToolResult = vi.fn()
    recordProposal({
      toolCallId: 'tc-p3',
      toolName: 'add_criteria',
      input: { name: 'Test', group: 'inclusion', logic: 'AND', items: [] },
    }, { addToolResult })
    resolveProposal('tc-p3', 'rejected', { addToolResult })
    expect(addToolResult).toHaveBeenCalledWith({
      tool: 'add_criteria',
      toolCallId: 'tc-p3',
      output: expect.objectContaining({ decision: 'rejected' }),
    })
  })
})
