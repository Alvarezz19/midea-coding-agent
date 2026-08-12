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
  setExpectedProfile,
  setInteraction,
  setSession,
  startAssistantTurn,
  startTool
} from '@/store/chat'

import { DEFAULT_MIDEA_PROFILE, type PickedFile } from '../../electron/contracts'

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
  args?: Record<string, unknown>
  result?: unknown
  inline_diff?: string
  duration_s?: number
}

class MideaAgentClient {
  private client = this.createGatewayClient()
  private runtimeStatusUnsubscribe: (() => void) | null = null
  private startPromise: Promise<void> | null = null
  private started = false
  private activeProfile: string = DEFAULT_MIDEA_PROFILE

  start(profile?: string): Promise<void> {
    if (this.started) {
      return Promise.resolve()
    }

    if (this.startPromise) {
      return this.startPromise
    }

    this.startPromise = this.connectInitial(profile)
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
    await this.connect(true, this.activeProfile)
    this.started = true
  }

  get profile(): string {
    return this.activeProfile
  }

  async switchProfile(profile: string): Promise<void> {
    const next = profile.trim()

    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(next) || next === this.activeProfile) {
      return
    }

    this.started = false
    this.client.close()
    this.client = this.createGatewayClient()
    this.activeProfile = next
    setExpectedProfile(next)
    resetConversation()
    await this.connect(true, next)
    this.started = true
  }

  async releaseProfile(fallback = 'default'): Promise<void> {
    if (this.activeProfile === fallback) {
      return
    }

    await this.switchProfile(fallback)
  }

  async newConversation(): Promise<void> {
    const sessionId = $chat.get().runtimeSessionId

    if (sessionId) {
      await this.client.request('session.close', { session_id: sessionId }).catch(() => undefined)
    }

    resetConversation()
    await this.createSession()
  }

  async send(text: string, files: PickedFile[] = []): Promise<void> {
    const value = text.trim()
    const sessionId = $chat.get().runtimeSessionId

    if ((!value && files.length === 0) || !sessionId || $chat.get().busy) {
      return
    }

    let prompt = value || '请查看附件。'

    try {
      const refs: string[] = []

      for (const file of files) {
        if (file.mimeType.startsWith('image/')) {
          const result = await this.client.request<{ attached?: boolean; path?: string; text?: string }>('image.attach', {
            path: file.path,
            session_id: sessionId
          })

          refs.push(result.text || `[图片附件: ${file.name}]`)
        } else {
          const result = await this.client.request<{ ref_text?: string; attached?: boolean }>('file.attach', {
            name: file.name,
            path: file.path,
            session_id: sessionId
          })

          refs.push(result.ref_text || `[文件附件: ${file.name}]`)
        }
      }

      if (refs.length > 0) {
        prompt = `${refs.join('\n')}\n\n${value || '请查看这些附件。'}`
      }
    } catch (error) {
      failTurn(this.errorMessage(error))

      return
    }

    beginUserTurn(value || '发送了附件', files)

    try {
      await this.client.request('prompt.submit', { session_id: sessionId, text: prompt })
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

  private async connect(restart: boolean, profile: string): Promise<void> {
    setConnection('starting', restart ? '正在重启 Runtime' : '正在启动 Runtime')
    this.runtimeStatusUnsubscribe?.()
    this.runtimeStatusUnsubscribe = window.mideaDesktop.runtime.onStatus(status => {
      if (status.phase === 'error') {
        setConnection('error', status.detail || 'Runtime 启动失败')
      }
    })

    try {
      const connection = restart
        ? await window.mideaDesktop.runtime.restart(profile)
        : await window.mideaDesktop.runtime.connect(profile)

      if (connection.profile !== profile) {
        throw new Error(`Runtime profile 不匹配：${connection.profile}`)
      }

      await this.client.connect(connection.wsUrl)
      await this.createSession()
    } catch (error) {
      setConnection('error', this.errorMessage(error))
      throw error
    }
  }

  private async connectInitial(profile?: string): Promise<void> {
    setConnection('starting', '正在启动 Runtime')
    this.runtimeStatusUnsubscribe?.()
    this.runtimeStatusUnsubscribe = window.mideaDesktop.runtime.onStatus(status => {
      if (status.phase === 'error') {
        setConnection('error', status.detail || 'Runtime 启动失败')
      }
    })

    try {
      const connection = await window.mideaDesktop.runtime.connect(profile)

      this.activeProfile = connection.profile
      setExpectedProfile(connection.profile)
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

    if (actualProfile !== this.activeProfile) {
      await this.client.request('session.close', { session_id: created.session_id }).catch(() => undefined)
      throw new Error(`Runtime profile 校验失败：期望 ${this.activeProfile}，实际 ${actualProfile || '未知'}`)
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
        startTool(payload.tool_id || `tool-${Date.now()}`, payload.name || 'tool', payload.context || '', payload.args)

        break

      case 'tool.complete':
        completeTool(
          payload.tool_id || '',
          payload.summary || payload.result_text || '',
          payload.error,
          payload.result,
          payload.inline_diff,
          payload.duration_s,
          payload.args
        )

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
