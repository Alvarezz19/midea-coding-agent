import { describe, expect, it, vi } from 'vitest'

import { waitForBackgroundAction } from './background-action'

describe('waitForBackgroundAction', () => {
  it('returns immediately for a synchronous operation', async () => {
    const status = vi.fn()

    await expect(waitForBackgroundAction({
      sleep: async () => undefined,
      started: { name: 'reports', ok: true },
      status
    })).resolves.toBeNull()

    expect(status).not.toHaveBeenCalled()
  })

  it('polls a spawned action until it exits successfully', async () => {
    const status = vi
      .fn()
      .mockResolvedValueOnce({ exit_code: null, lines: [], name: 'install', pid: 42, running: true })
      .mockResolvedValueOnce({ exit_code: 0, lines: ['done'], name: 'install', pid: 42, running: false })

    await expect(waitForBackgroundAction({
      sleep: async () => undefined,
      started: { name: 'install', ok: true, pid: 42 },
      status
    })).resolves.toMatchObject({ exit_code: 0 })

    expect(status).toHaveBeenCalledTimes(2)
  })

  it('reports a failed action with its log tail', async () => {
    await expect(waitForBackgroundAction({
      sleep: async () => undefined,
      started: { action: 'mcp-install-reports', background: true, name: 'reports', ok: true },
      status: vi.fn().mockResolvedValue({ exit_code: 1, lines: ['clone failed'], name: 'mcp-install-reports', pid: 42, running: false })
    })).rejects.toThrow('clone failed')
  })
})
