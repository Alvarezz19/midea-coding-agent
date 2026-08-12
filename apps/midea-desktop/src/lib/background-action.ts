import type { ActionStartResponse, ActionStatusResponse } from '@/lib/management-api'

interface WaitForActionOptions {
  maxAttempts?: number
  sleep?: (milliseconds: number) => Promise<void>
  started: ActionStartResponse
  status: (name: string) => Promise<ActionStatusResponse>
}

const defaultSleep = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds))

export async function waitForBackgroundAction({
  maxAttempts = 150,
  sleep = defaultSleep,
  started,
  status
}: WaitForActionOptions): Promise<ActionStatusResponse | null> {
  if (!started.ok) {
    throw new Error('后台任务启动失败')
  }

  const actionName = started.action || (started.pid ? started.name : '')

  if (!actionName) {
    return null
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(1000)

    const current = await status(actionName)

    if (current.running) {
      continue
    }

    if (current.exit_code !== 0) {
      const detail = current.lines.slice(-8).join('\n').trim()

      throw new Error(detail || `后台任务失败（退出码 ${current.exit_code ?? '未知'}）`)
    }

    return current
  }

  throw new Error(`等待后台任务 ${actionName} 超时`)
}
