import type { McpOAuthFlow } from '@/lib/management-api'

interface CompleteMcpOAuthOptions {
  maxPollFailures?: number
  openExternal: (url: string) => Promise<void>
  serverName: string
  sleep?: (milliseconds: number) => Promise<void>
  start: (name: string) => Promise<McpOAuthFlow>
  status: (flowId: string) => Promise<McpOAuthFlow>
}

const defaultSleep = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds))

export async function completeMcpOAuth({
  maxPollFailures = 3,
  openExternal,
  serverName,
  sleep = defaultSleep,
  start,
  status
}: CompleteMcpOAuthOptions): Promise<McpOAuthFlow> {
  const started = await start(serverName)

  if (started.status === 'error') {
    throw new Error(started.error || 'OAuth 启动失败')
  }

  if (!started.authorization_url) {
    throw new Error('OAuth 服务未返回授权地址')
  }

  await openExternal(started.authorization_url)

  let pollFailures = 0

  for (;;) {
    let current: McpOAuthFlow

    try {
      current = await status(started.flow_id)
      pollFailures = 0
    } catch (error) {
      pollFailures += 1

      if (pollFailures >= maxPollFailures) {
        throw error
      }

      await sleep(1000)

      continue
    }

    if (current.status === 'approved') {
      return current
    }

    if (current.status === 'error') {
      throw new Error(current.error || 'OAuth 授权失败')
    }

    await sleep(1000)
  }
}
