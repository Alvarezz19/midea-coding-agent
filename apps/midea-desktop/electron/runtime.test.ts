import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { MIDEA_RUNTIME_PROFILE } from './contracts.js'
import { mideaBackendArgs, parseBackendReadyPort, resolveRuntimeCommand } from './runtime.js'

describe('Midea runtime contract', () => {
  it('pins every backend launch to midea-dev', () => {
    expect(mideaBackendArgs()).toEqual([
      '--profile',
      MIDEA_RUNTIME_PROFILE,
      'serve',
      '--isolated',
      '--host',
      '127.0.0.1',
      '--port',
      '0'
    ])
  })

  it('prefers the repository virtual environment', () => {
    const root = path.resolve('repo')
    const expected = path.join(root, '.venv', 'Scripts/hermes.exe')
    const result = resolveRuntimeCommand(root, 'win32', candidate => candidate === expected)

    expect(result).toEqual({ command: expected, label: '.venv Hermes runtime' })
  })

  it('falls back to the platform PATH command', () => {
    expect(resolveRuntimeCommand(null, 'win32').command).toBe('hermes.exe')
    expect(resolveRuntimeCommand(null, 'linux').command).toBe('hermes')
  })

  it('accepts only valid backend readiness announcements', () => {
    expect(parseBackendReadyPort('HERMES_BACKEND_READY port=43120')).toBe(43_120)
    expect(parseBackendReadyPort('HERMES_DASHBOARD_READY port=9119')).toBe(9119)
    expect(parseBackendReadyPort('HERMES_BACKEND_READY port=70000')).toBeNull()
    expect(parseBackendReadyPort('ready port=9119')).toBeNull()
  })
})
