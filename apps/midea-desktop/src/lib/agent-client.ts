import { type GatewayEvent, JsonRpcGatewayClient } from '@hermes/shared'

import {
  $chat,
  appendAssistantDelta,
  beginUserTurn,
  completeAssistantTurn,
  completeTool,
  failTurn,
  type PendingInteraction,
  resetConversation,
  setConnection,
  setInteraction,
  setSession,
  startAssistantTurn,
  startTool
} from '@/store/chat'

import { MIDEA_RUNTIME_PROFILE } from '../../electron/contracts'

interface SessionCreateResponse {
  info?: {
    profile_name?: string
  }
  session_id: string
}

interface EventPayload {
  allow_permanent?: boolean
  choices?: string[] | null
  command?: string
  context?: string
  description?: string
  env_var?: string
  error?: string
  message?: string
  name?: string
  prompt?: string
  question?: string
  request_id?: string
  result_text?: string
  summary?: string
  text?: string
  tool_id?: string
}

class MideaAgentClient {
  private client = this.createGatewayClient()
  private runtimeStatusUnsubscribe: (() => void) | null = null
  private startPromise: Promise<void> | null = null
  private started = false

  start(): Promise<void> {
    if (this.started) {
      return Promise.resolve()
    }

    if (this.startPromise) {
      return this.startPromise
    }

    this.startPromise = this.connect(false)
      .then(() => {
        this.started = true
      })
      .finally(() => {
        this.startPromise = null
      })

    return this.startPromise
  }

  async retry(): Promise<void> {
    this.started = false
    this.client.close()
    this.client = this.createGatewayClient()
    resetConversation()
    await this.connect(true)
    this.started = true
  }

  async newConversation(): Promise<void> {
    const sessionId = $chat.get().runtimeSessionId

    if (sessionId) {
      await this.client.request('session.close', { session_id: sessionId }).catch(() => undefined)
    }

    resetConversation()
    await this.createSession()
  }

  async send(text: string): Promise<void> {
    const value = text.trim()
    const sessionId = $chat.get().runtimeSessionId

    if (!value || !sessionId || $chat.get().busy) {
      return
    }

    beginUserTurn(value)

    try {
      await this.client.request('prompt.submit', { session_id: sessionId, text: value })
    } catch (error) {
      failTurn(this.errorMessage(error))
    }
  }

  async interrupt(): Promise<void> {
    const sessionId = $chat.get().runtimeSessionId

    if (!sessionId) {
      return
    }

    await this.client.request('session.interrupt', { session_id: sessionId }).catch(error => {
      failTurn(this.errorMessage(error))
    })
  }

  async resolveInteraction(value: string): Promise<void> {
    const interaction = $chat.get().interaction

    if (!interaction) {
      return
    }

    const request = this.interactionRequest(interaction, value)

    try {
      await this.client.request(request.method, request.params)
      setInteraction(null)
    } catch (error) {
      failTurn(this.errorMessage(error))
    }
  }

  private createGatewayClient(): JsonRpcGatewayClient {
    const client = new JsonRpcGatewayClient({ requestIdPrefix: 'midea' })

    client.onAny(event => this.handleEvent(event))
    client.onState(state => {
      if (state === 'connecting') {
        setConnection('connecting', '正在连接 Agent Runtime')
      } else if (state === 'error' || state === 'closed') {
        setConnection('error', 'Runtime 连接已断开')
      }
    })

    return client
  }

  private async connect(restart: boolean): Promise<void> {
    setConnection('starting', restart ? '正在重启 Runtime' : '正在启动 Runtime')
    this.runtimeStatusUnsubscribe?.()
    this.runtimeStatusUnsubscribe = window.mideaDesktop.runtime.onStatus(status => {
      if (status.phase === 'error') {
        setConnection('error', status.detail || 'Runtime 启动失败')
      }
    })

    try {
      const connection = restart
        ? await window.mideaDesktop.runtime.restart()
        : await window.mideaDesktop.runtime.connect()

      if (connection.profile !== MIDEA_RUNTIME_PROFILE) {
        throw new Error(`Runtime profile 不匹配：${connection.profile}`)
      }

      await this.client.connect(connection.wsUrl)
      await this.createSession()
    } catch (error) {
      setConnection('error', this.errorMessage(error))
      throw error
    }
  }

  private async createSession(): Promise<void> {
    const created = await this.client.request<SessionCreateResponse>('session.create', {
      cols: 96,
      source: 'midea-desktop'
    })

    const actualProfile = created.info?.profile_name || ''

    if (actualProfile !== MIDEA_RUNTIME_PROFILE) {
      await this.client.request('session.close', { session_id: created.session_id }).catch(() => undefined)
      throw new Error(`Runtime profile 校验失败：期望 ${MIDEA_RUNTIME_PROFILE}，实际 ${actualProfile || '未知'}`)
    }

    setSession(created.session_id, actualProfile)
  }

  private handleEvent(event: GatewayEvent): void {
    const sessionId = $chat.get().runtimeSessionId

    if (event.session_id && sessionId && event.session_id !== sessionId) {
      return
    }

    const payload = (event.payload || {}) as EventPayload

    switch (event.type) {
      case 'message.start':
        startAssistantTurn()

        break

      case 'message.delta':
        appendAssistantDelta(payload.text || '')

        break

      case 'message.complete':
        completeAssistantTurn(payload.text)

        break

      case 'tool.start':
        startTool(payload.tool_id || `tool-${Date.now()}`, payload.name || 'tool', payload.context || '')

        break

      case 'tool.complete':
        completeTool(payload.tool_id || '', payload.summary || payload.result_text || '', payload.error)

        break

      case 'clarify.request':
        if (payload.request_id && payload.question) {
          setInteraction({
            choices: payload.choices || [],
            question: payload.question,
            requestId: payload.request_id,
            type: 'clarify'
          })
        }

        break

      case 'approval.request':
        setInteraction({
          allowPermanent: Boolean(payload.allow_permanent),
          command: payload.command || '',
          description: payload.description || '需要执行授权',
          sessionId: event.session_id || sessionId || '',
          type: 'approval'
        })

        break

      case 'secret.request':
        if (payload.request_id) {
          setInteraction({
            prompt: payload.prompt || `请输入 ${payload.env_var || '所需凭据'}`,
            requestId: payload.request_id,
            type: 'secret'
          })
        }

        break

      case 'sudo.request':
        if (payload.request_id) {
          setInteraction({ requestId: payload.request_id, type: 'sudo' })
        }

        break

      case 'error':
        failTurn(payload.message || payload.text || 'Agent 执行失败')

        break

      default:
        break
    }
  }

  private interactionRequest(
    interaction: PendingInteraction,
    value: string
  ): { method: string; params: Record<string, unknown> } {
    switch (interaction.type) {
      case 'clarify':
        return { method: 'clarify.respond', params: { answer: value, request_id: interaction.requestId } }

      case 'approval':
        return { method: 'approval.respond', params: { choice: value, session_id: interaction.sessionId } }

      case 'secret':
        return { method: 'secret.respond', params: { request_id: interaction.requestId, value } }

      case 'sudo':
        return { method: 'sudo.respond', params: { password: value, request_id: interaction.requestId } }
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}

export const mideaAgent = new MideaAgentClient()
