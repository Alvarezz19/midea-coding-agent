import { beforeEach, describe, expect, it } from 'vitest'

import {
  $chat,
  appendAssistantDelta,
  beginUserTurn,
  completeAssistantTurn,
  completeTool,
  resetChatStoreForTest,
  startTool
} from './chat'

describe('chat timeline', () => {
  beforeEach(resetChatStoreForTest)

  it('accumulates assistant deltas into one completed response', () => {
    beginUserTurn('你好')
    appendAssistantDelta('你')
    appendAssistantDelta('好')
    completeAssistantTurn()

    expect($chat.get().timeline).toMatchObject([
      { role: 'user', text: '你好' },
      { role: 'assistant', state: 'complete', text: '你好' }
    ])
    expect($chat.get().busy).toBe(false)
  })

  it('keeps tool activity as a stable timeline item', () => {
    startTool('tool-1', 'midea_kb_search', '检索资料')
    completeTool('tool-1', '已找到 3 条资料')

    expect($chat.get().timeline).toEqual([
      {
        id: 'tool-1',
        kind: 'tool',
        name: 'midea_kb_search',
        state: 'complete',
        summary: '已找到 3 条资料'
      }
    ])
  })
})
