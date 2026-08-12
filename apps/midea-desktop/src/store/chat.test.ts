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

  it('retains attachments and structured tool details', () => {
    const attachment = { mimeType: 'image/png', name: 'fault.png', path: 'D:\\fault.png', size: 128 }

    beginUserTurn('分析故障图', [attachment])
    startTool('tool-2', 'midea_fault_diagnose', '诊断中', { code: 'E1' })
    completeTool('tool-2', '已完成', undefined, { cause: 'sensor' }, '+fixed', 1.25, { code: 'E2' })

    expect($chat.get().timeline).toMatchObject([
      { attachments: [attachment], role: 'user' },
      {
        args: { code: 'E2' },
        durationSeconds: 1.25,
        inlineDiff: '+fixed',
        result: { cause: 'sensor' },
        state: 'complete'
      }
    ])
  })
})
