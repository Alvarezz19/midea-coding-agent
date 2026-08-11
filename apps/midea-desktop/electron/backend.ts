import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'

import { MIDEA_RUNTIME_PROFILE, type RuntimeConnection, type RuntimeStatus } from './contracts.js'
import { mideaBackendArgs, parseBackendReadyPort, type RuntimeCommand } from './runtime.js'

const START_TIMEOUT_MS = 90_000

type StatusListener = (status: RuntimeStatus) => void

export class MideaBackend {
  private child: ChildProcess | null = null
  private connection: RuntimeConnection | null = null
  private starting: Promise<RuntimeConnection> | null = null

  constructor(
    private readonly runtime: RuntimeCommand,
    private readonly cwd: string,
    private readonly onStatus: StatusListener
  ) {}

  connect(): Promise<RuntimeConnection> {
    if (this.connection && this.child?.exitCode === null) {
      return Promise.resolve(this.connection)
    }

    if (this.starting) {
      return this.starting
    }

    this.starting = this.start().finally(() => {
      this.starting = null
    })

    return this.starting
  }

  async restart(): Promise<RuntimeConnection> {
    this.stop()

    return this.connect()
  }

  stop(): void {
    const child = this.child

    this.child = null
    this.connection = null

    if (child && child.exitCode === null) {
      child.kill()
    }

    this.onStatus({ phase: 'stopped', profile: MIDEA_RUNTIME_PROFILE })
  }

  private async start(): Promise<RuntimeConnection> {
    const token = randomBytes(32).toString('base64url')

    this.onStatus({
      detail: this.runtime.label,
      phase: 'starting',
      profile: MIDEA_RUNTIME_PROFILE
    })

    const child = spawn(this.runtime.command, mideaBackendArgs(), {
      cwd: this.cwd,
      env: {
        ...process.env,
        HERMES_DASHBOARD_SESSION_TOKEN: token,
        HERMES_DESKTOP: '1'
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })

    this.child = child
    child.stderr?.on('data', chunk => process.stderr.write(`[midea-runtime] ${String(chunk)}`))

    child.once('exit', (code, signal) => {
      if (this.child !== child) {
        return
      }

      this.child = null
      this.connection = null
      this.onStatus({
        detail: `Runtime exited (${signal ?? code ?? 'unknown'})`,
        phase: 'error',
        profile: MIDEA_RUNTIME_PROFILE
      })
    })

    try {
      const port = await waitForReadyPort(child)

      const connection: RuntimeConnection = {
        profile: MIDEA_RUNTIME_PROFILE,
        runtime: this.runtime.label,
        wsUrl: `ws://127.0.0.1:${port}/api/ws?token=${encodeURIComponent(token)}`
      }

      this.connection = connection
      this.onStatus({ phase: 'ready', profile: MIDEA_RUNTIME_PROFILE })

      return connection
    } catch (error) {
      if (this.child === child) {
        this.child = null
      }

      if (child.exitCode === null) {
        child.kill()
      }

      const detail = error instanceof Error ? error.message : String(error)

      this.onStatus({ detail, phase: 'error', profile: MIDEA_RUNTIME_PROFILE })
      throw error
    }
  }
}

function waitForReadyPort(child: ChildProcess, timeoutMs = START_TIMEOUT_MS): Promise<number> {
  return new Promise((resolve, reject) => {
    let output = ''
    let settled = false

    const cleanup = () => {
      clearTimeout(timer)
      child.stdout?.off('data', onData)
      child.off('error', onError)
      child.off('exit', onExit)
    }

    const finish = (action: () => void) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      action()
    }

    const onData = (chunk: Buffer) => {
      output += chunk.toString('utf8')
      process.stdout.write(`[midea-runtime] ${chunk.toString('utf8')}`)
      const port = parseBackendReadyPort(output)

      if (port) {
        finish(() => resolve(port))
      } else if (output.length > 64 * 1024) {
        output = output.slice(-32 * 1024)
      }
    }

    const onError = (error: Error) => finish(() => reject(error))

    const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
      finish(() => reject(new Error(`Hermes runtime exited before it became ready (${signal ?? code ?? 'unknown'})`)))

    const timer = setTimeout(
      () => finish(() => reject(new Error(`Timed out waiting for Hermes runtime after ${timeoutMs}ms`))),
      timeoutMs
    )

    child.stdout?.on('data', onData)
    child.once('error', onError)
    child.once('exit', onExit)
  })
}
