import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getActionStatus, getConfig, getToolsetModels, installMcp, saveConfig, setModel, setToolsetModel, updateSkill } from './management-api'

const api = vi.fn()

describe('management API bridge', () => {
  beforeEach(() => {
    api.mockReset()
    api.mockResolvedValue({ ok: true })
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { mideaDesktop: { runtime: { api } } }
    })
  })

  it('binds reads and writes to the requested profile', async () => {
    await getConfig('midea-staging')
    await updateSkill('service-sop', '# SOP', 'midea-staging')

    expect(api).toHaveBeenNthCalledWith(1, {
      body: undefined,
      method: 'GET',
      path: '/api/config',
      profile: 'midea-staging'
    })
    expect(api).toHaveBeenNthCalledWith(2, {
      body: { content: '# SOP', name: 'service-sop', profile: 'midea-staging' },
      method: 'PUT',
      path: '/api/skills/content',
      profile: 'midea-staging'
    })
  })

  it('uses Hermes request envelopes for config, model, and MCP writes', async () => {
    await saveConfig({ display: { compact: true } }, 'midea-dev')
    await setModel('deepseek', 'deepseek-chat', 'midea-dev', true)
    await installMcp('reports', { REPORTS_KEY: 'secret' }, 'midea-dev')

    expect(api).toHaveBeenNthCalledWith(1, expect.objectContaining({ body: { config: { display: { compact: true } } } }))
    expect(api).toHaveBeenNthCalledWith(2, expect.objectContaining({ body: { confirm_expensive_model: true, model: 'deepseek-chat', provider: 'deepseek', scope: 'main' } }))
    expect(api).toHaveBeenNthCalledWith(3, expect.objectContaining({ body: { enable: true, env: { REPORTS_KEY: 'secret' }, name: 'reports', profile: 'midea-dev' } }))
  })

  it('uses Hermes action and tool-model contracts', async () => {
    await getActionStatus('tools-post-setup', 'midea-dev')
    await getToolsetModels('image_gen', 'fal', 'midea-dev')
    await setToolsetModel('image_gen', 'fal-ai/fast-sdxl', 'fal', 'midea-dev')

    expect(api).toHaveBeenNthCalledWith(1, expect.objectContaining({ path: '/api/actions/tools-post-setup/status?lines=300' }))
    expect(api).toHaveBeenNthCalledWith(2, expect.objectContaining({ path: '/api/tools/toolsets/image_gen/models?provider=fal' }))
    expect(api).toHaveBeenNthCalledWith(3, expect.objectContaining({ body: { model: 'fal-ai/fast-sdxl', provider: 'fal' } }))
  })
})
