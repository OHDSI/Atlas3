import { describe, it, expect } from 'vitest'
import type { UIMessage } from 'ai'
import { locateGroup } from '../../../plugins-dev/pythia-plugin/src/locate-group'

function assistantWithToolCalls(id: string, toolCallIds: string[]): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: toolCallIds.map(cid => ({
      type: 'tool-input-available',
      toolCallId: cid,
      toolName: 'add_inclusion_rule',
      input: {},
    })),
  } as unknown as UIMessage
}

function userMessage(id: string, text: string): UIMessage {
  return {
    id,
    role: 'user',
    parts: [{ type: 'text', text }],
  } as unknown as UIMessage
}

describe('locateGroup', () => {
  it('finds the parent assistant message and the position of the tool call', () => {
    const messages: UIMessage[] = [
      userMessage('u1', 'hello'),
      assistantWithToolCalls('a1', ['tc-1', 'tc-2', 'tc-3']),
    ]
    expect(locateGroup(messages, 'tc-1')).toEqual({ groupId: 'a1', groupIndex: 0 })
    expect(locateGroup(messages, 'tc-2')).toEqual({ groupId: 'a1', groupIndex: 1 })
    expect(locateGroup(messages, 'tc-3')).toEqual({ groupId: 'a1', groupIndex: 2 })
  })

  it('returns the most recent assistant message containing the tool call', () => {
    const messages: UIMessage[] = [
      assistantWithToolCalls('a1', ['old-1']),
      userMessage('u1', 'next'),
      assistantWithToolCalls('a2', ['new-1']),
    ]
    expect(locateGroup(messages, 'old-1')).toEqual({ groupId: 'a1', groupIndex: 0 })
    expect(locateGroup(messages, 'new-1')).toEqual({ groupId: 'a2', groupIndex: 0 })
  })

  it('returns empty object when the tool call cannot be found', () => {
    const messages: UIMessage[] = [assistantWithToolCalls('a1', ['x'])]
    expect(locateGroup(messages, 'missing')).toEqual({})
  })

  it('returns empty when there are no messages', () => {
    expect(locateGroup([], 'whatever')).toEqual({})
  })

  it('skips user messages while walking backward', () => {
    const messages: UIMessage[] = [
      userMessage('u1', 'a'),
      userMessage('u2', 'b'),
      assistantWithToolCalls('a1', ['tc']),
      userMessage('u3', 'c'),
    ]
    expect(locateGroup(messages, 'tc')).toEqual({ groupId: 'a1', groupIndex: 0 })
  })
})
