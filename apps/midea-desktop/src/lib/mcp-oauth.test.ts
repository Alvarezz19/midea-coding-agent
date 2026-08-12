import { describe, expect, it, vi } from 'vitest'

import { completeMcpOAuth } from './mcp-oauth'

const started = {
  authorization_url: 'https://idp.example/authorize',
  error: null,
  flow_id: 'flow-1',
  status: 'authorization_required' as const
}

describe('completeMcpOAuth', () => {
  it('opens the authorization URL and polls until approval', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined)

    const status = vi
      .fn()
      .mockResolvedValueOnce(started)
      .mockResolvedValueOnce({ ...started, status: 'approved' })

    const result = await completeMcpOAuth({
      openExternal,
      serverName: 'reports',
      sleep: async () => undefined,
      start: vi.fn().mockResolvedValue(started),
      status
    })

    expect(openExternal).toHaveBeenCalledWith(started.authorization_url)

    expect(status).toHaveBeenCalledTimes(2)
    expect(result.status).toBe('approved')
  })

  it('retries transient status failures', async () => {
    const status = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ ...started, status: 'approved' })

    await expect(completeMcpOAuth({
      openExternal: vi.fn().mockResolvedValue(undefined),
      serverName: 'reports',
      sleep: async () => undefined,
      start: vi.fn().mockResolvedValue(started),
      status
    })).resolves.toMatchObject({ status: 'approved' })

    expect(status).toHaveBeenCalledTimes(2)
  })

  it('surfaces an OAuth flow error', async () => {
    await expect(completeMcpOAuth({
      openExternal: vi.fn().mockResolvedValue(undefined),
      serverName: 'reports',
      sleep: async () => undefined,
      start: vi.fn().mockResolvedValue(started),
      status: vi.fn().mockResolvedValue({ ...started, error: 'access denied', status: 'error' })
    })).rejects.toThrow('access denied')
  })
})
