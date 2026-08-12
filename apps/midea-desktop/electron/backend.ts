import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'

import {
  DEFAULT_MIDEA_PROFILE,
  type RuntimeApiRequest,
  type RuntimeConnection,
  type RuntimeStatus
} from './contracts.js'
import { isValidProfileName, mideaBackendArgs, parseBackendReadyPort, type RuntimeCommand } from './runtime.js'

const START_TIMEOUT_MS = 90_000

type StatusListener = (status: RuntimeStatus) => void

export class MideaBackend {
  private child: ChildProcess | null = null
  private connection: RuntimeConnection | null = null
  private starting: Promise<RuntimeConnection> | null = null
  private profile: string = DEFAULT_MIDEA_PROFILE
  private apiBaseUrl = ''
  private sessionToken = ''

  constructor(
    private readonly runtime: RuntimeCommand,
    private readonly cwd: string,
    private readonly onStatus: StatusListener
  ) {}

  connect(profile: string = this.profile): Promise<RuntimeConnection> {
    if (!isValidProfileName(profile)) {
      return Promise.reject(new Error(`Invalid Hermes profile name: ${profile}`))
    }

    if (this.connection && this.child?.exitCode === null) {
      return this.connection.profile === profile
        ? Promise.resolve(this.connection)
        : this.restart(profile)
    }

    if (this.starting) {
      return this.starting.then(
        connection => connection.profile === profile ? connection : this.restart(profile),
        () => this.connect(profile)
      )
    }

    this.profile = profile
    this.starting = this.start().finally(() => {
      this.starting = null
    })

    return this.starting
  }

  async restart(profile: string = this.profile): Promise<RuntimeConnection> {
    if (!isValidProfileName(profile)) {
      throw new Error(`Invalid Hermes profile name: ${profile}`)
    }

    this.profile = profile
    this.stop()

    return this.connect()
  }

  stop(): void {
    const child = this.child

    this.child = null
    this.connection = null
    this.apiBaseUrl = ''
    this.sessionToken = ''

    if (child && child.exitCode === null) {
      child.kill()
    }

    this.onStatus({ phase: 'stopped', profile: this.profile })
  }

  async api(request: RuntimeApiRequest): Promise<unknown> {
    await this.connect(this.profile)

    const url = new URL(request.path, this.apiBaseUrl)

    if (request.profile && request.path !== '/api/profiles') {
      url.searchParams.set('profile', request.profile)
    }

    const response = await fetch(url, {
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      headers: {
        'Content-Type': 'application/json',
        'X-Hermes-Session-Token': this.sessionToken
      },
      method: request.method ?? 'GET'
    })

    const text = await response.text()
    let payload: unknown = null

    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = text
    }

    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'detail' in payload ? String(payload.detail) : text
      throw new Error(detail || `Hermes API request failed (${response.status})`)
    }

    return payload
  }

  private async start(): Promise<RuntimeConnection> {
    const token = randomBytes(32).toString('base64url')

    this.onStatus({
      detail: this.runtime.label,
      phase: 'starting',
      profile: this.profile
    })

    const profile = this.profile

    const child = spawn(this.runtime.command, mideaBackendArgs(profile), {
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
        profile
      })
    })

    try {
      const port = await waitForReadyPort(child)

      const connection: RuntimeConnection = {
        profile,
        runtime: this.runtime.label,
        wsUrl: `ws://127.0.0.1:${port}/api/ws?token=${encodeURIComponent(token)}`
      }

      this.apiBaseUrl = `http://127.0.0.1:${port}`
      this.sessionToken = token
      this.connection = connection
      this.onStatus({ phase: 'ready', profile })

      return connection
    } catch (error) {
      if (this.child === child) {
        this.child = null
      }

      if (child.exitCode === null) {
        child.kill()
      }

      const detail = error instanceof Error ? error.message : String(error)

      this.onStatus({ detail, phase: 'error', profile })
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
