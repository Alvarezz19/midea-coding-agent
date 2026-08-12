import { describe, expect, it, vi } from 'vitest'

import { MideaBackend } from './backend.js'
import type { RuntimeConnection } from './contracts.js'

const runtime = { command: 'hermes', label: 'test runtime' }

function connectedBackend(profile: string): MideaBackend {
  const backend = new MideaBackend(runtime, '.', vi.fn())

  const connection: RuntimeConnection = {
    profile,
    runtime: runtime.label,
    wsUrl: 'ws://127.0.0.1:4000/api/ws'
  }

  Object.assign(backend, { child: { exitCode: null }, connection, profile })

  return backend
}

describe('MideaBackend profile connection contract', () => {
  it('rejects invalid profile names at the backend boundary', async () => {
    const backend = connectedBackend('midea-dev')

    await expect(backend.connect('../default')).rejects.toThrow('Invalid Hermes profile name')
    await expect(backend.restart('Midea-Prod')).rejects.toThrow('Invalid Hermes profile name')
  })

  it('restarts instead of returning a connected runtime for another profile', async () => {
    const backend = connectedBackend('midea-dev')

    const next: RuntimeConnection = {
      profile: 'service-staging',
      runtime: runtime.label,
      wsUrl: 'ws://127.0.0.1:4001/api/ws'
    }

    const restart = vi.spyOn(backend, 'restart').mockResolvedValue(next)

    await expect(backend.connect('service-staging')).resolves.toBe(next)

    expect(restart).toHaveBeenCalledOnce()
    expect(restart).toHaveBeenCalledWith('service-staging')
  })

  it('does not return an in-flight connection for another profile', async () => {
    const backend = new MideaBackend(runtime, '.', vi.fn())

    const current: RuntimeConnection = {
      profile: 'midea-dev',
      runtime: runtime.label,
      wsUrl: 'ws://127.0.0.1:4000/api/ws'
    }

    const next: RuntimeConnection = {
      profile: 'service-staging',
      runtime: runtime.label,
      wsUrl: 'ws://127.0.0.1:4001/api/ws'
    }

    Object.assign(backend, { profile: 'midea-dev', starting: Promise.resolve(current) })

    const restart = vi.spyOn(backend, 'restart').mockResolvedValue(next)

    await expect(backend.connect('service-staging')).resolves.toBe(next)

    expect(restart).toHaveBeenCalledWith('service-staging')
  })
})
