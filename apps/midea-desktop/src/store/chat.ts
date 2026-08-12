import { atom } from 'nanostores'

import { DEFAULT_MIDEA_PROFILE } from '../../electron/contracts'
import type { PickedFile } from '../../electron/contracts'

export type ConnectionPhase = 'starting' | 'connecting' | 'ready' | 'error'

export interface ChatMessage {
  id: string
  kind: 'message'
  role: 'assistant' | 'user' | 'error'
  state: 'streaming' | 'complete'
  text: string
  attachments?: PickedFile[]
}

export interface ToolActivity {
  id: string
  kind: 'tool'
  name: string
  state: 'running' | 'complete' | 'error'
  summary: string
  args?: Record<string, unknown>
  result?: unknown
  inlineDiff?: string
  durationSeconds?: number
}

export type TimelineItem = ChatMessage | ToolActivity

export type PendingInteraction =
  | {
      choices: string[]
      question: string
      requestId: string
      type: 'clarify'
    }
  | {
      allowPermanent: boolean
      command: string
      description: string
      sessionId: string
      type: 'approval'
    }
  | {
      prompt: string
      requestId: string
      type: 'secret'
    }
  | {
      requestId: string
      type: 'sudo'
    }

export interface ChatState {
  actualProfile: string | null
  busy: boolean
  connectionDetail: string
  connectionPhase: ConnectionPhase
  currentAssistantId: string | null
  expectedProfile: string
  interaction: PendingInteraction | null
  runtimeSessionId: string | null
  timeline: TimelineItem[]
}

const initialState = (): ChatState => ({
  actualProfile: null,
  busy: false,
  connectionDetail: '正在启动 Runtime',
  connectionPhase: 'starting',
  currentAssistantId: null,
  expectedProfile: DEFAULT_MIDEA_PROFILE,
  interaction: null,
  runtimeSessionId: null,
  timeline: []
})

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${++sequence}`

export const $chat = atom<ChatState>(initialState())

export function setConnection(phase: ConnectionPhase, detail: string): void {
  $chat.set({ ...$chat.get(), connectionDetail: detail, connectionPhase: phase })
}

export function setSession(runtimeSessionId: string, actualProfile: string): void {
  $chat.set({
    ...$chat.get(),
    actualProfile,
    connectionDetail: 'Runtime 已连接',
    connectionPhase: 'ready',
    runtimeSessionId
  })
}

export function setExpectedProfile(expectedProfile: string): void {
  $chat.set({ ...$chat.get(), expectedProfile })
}

export function resetConversation(): void {
  const state = $chat.get()

  $chat.set({
    ...state,
    busy: false,
    currentAssistantId: null,
    interaction: null,
    runtimeSessionId: null,
    timeline: []
  })
}

export function beginUserTurn(text: string, attachments: PickedFile[] = []): void {
  const state = $chat.get()

  const message: ChatMessage = {
    id: nextId('user'),
    kind: 'message',
    role: 'user',
    state: 'complete',
    text,
    attachments: attachments.length > 0 ? attachments : undefined
  }

  $chat.set({ ...state, busy: true, timeline: [...state.timeline, message] })
}

function ensureAssistant(state: ChatState): [ChatState, string] {
  if (state.currentAssistantId) {
    return [state, state.currentAssistantId]
  }

  const id = nextId('assistant')
  const message: ChatMessage = { id, kind: 'message', role: 'assistant', state: 'streaming', text: '' }

  return [{ ...state, currentAssistantId: id, timeline: [...state.timeline, message] }, id]
}

export function startAssistantTurn(): void {
  const [state] = ensureAssistant($chat.get())

  $chat.set({ ...state, busy: true })
}

export function appendAssistantDelta(text: string): void {
  const [state, id] = ensureAssistant($chat.get())

  const timeline = state.timeline.map(item =>
    item.id === id && item.kind === 'message' ? { ...item, text: item.text + text } : item
  )

  $chat.set({ ...state, busy: true, timeline })
}

export function completeAssistantTurn(text?: string): void {
  const [state, id] = ensureAssistant($chat.get())

  const timeline = state.timeline.map(item => {
    if (item.id !== id || item.kind !== 'message') {
      return item
    }

    return { ...item, state: 'complete' as const, text: text || item.text }
  })

  $chat.set({ ...state, busy: false, currentAssistantId: null, timeline })
}

export function startTool(toolId: string, name: string, summary: string, args?: Record<string, unknown>): void {
  const state = $chat.get()
  const existing = state.timeline.some(item => item.id === toolId)

  if (existing) {
    return
  }

  const tool: ToolActivity = {
    id: toolId || nextId('tool'),
    kind: 'tool',
    name: name || 'tool',
    state: 'running',
    summary,
    args
  }

  $chat.set({ ...state, timeline: [...state.timeline, tool] })
}

export function completeTool(
  toolId: string,
  summary: string,
  error?: string,
  result?: unknown,
  inlineDiff?: string,
  durationSeconds?: number,
  args?: Record<string, unknown>
): void {
  const state = $chat.get()

  const timeline = state.timeline.map(item =>
    item.id === toolId && item.kind === 'tool'
      ? {
          ...item,
          args: args || item.args,
          durationSeconds,
          inlineDiff,
          result,
          state: error ? ('error' as const) : ('complete' as const),
          summary: error || summary || item.summary
        }
      : item
  )

  $chat.set({ ...state, timeline })
}

export function setInteraction(interaction: PendingInteraction | null): void {
  $chat.set({ ...$chat.get(), interaction })
}

export function failTurn(message: string): void {
  const state = $chat.get()

  const error: ChatMessage = {
    id: nextId('error'),
    kind: 'message',
    role: 'error',
    state: 'complete',
    text: message
  }

  $chat.set({
    ...state,
    busy: false,
    currentAssistantId: null,
    timeline: [...state.timeline, error]
  })
}

export function resetChatStoreForTest(): void {
  sequence = 0
  $chat.set(initialState())
}
